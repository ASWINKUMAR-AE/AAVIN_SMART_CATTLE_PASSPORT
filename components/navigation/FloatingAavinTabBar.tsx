import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../context/LanguageContext';
import { useScroll } from '../../context/ScrollContext';
import {
  TAB_BAR_HEIGHT,
  BUTTON_SIZE,
  AAVIN_NAV_COLORS as AAVIN_COLORS,
  getCurvedBarPath,
} from './curvedNavPath';

export { TAB_BAR_HEIGHT, BUTTON_SIZE, getCurvedBarPath };

// Route name to icon & translation key mapping
const ROUTE_META_MAP: Record<
  string,
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
    labelKey: string;
    fallbackLabel: string;
  }
> = {
  // Farmer
  index: {
    outline: 'home-outline',
    filled: 'home',
    labelKey: 'nav.home',
    fallbackLabel: 'Home',
  },
  'milk-history': {
    outline: 'water-outline',
    filled: 'water',
    labelKey: 'nav.milk',
    fallbackLabel: 'Milk',
  },
  cows: {
    outline: 'paw-outline',
    filled: 'paw',
    labelKey: 'nav.myCows',
    fallbackLabel: 'My Cows',
  },
  notifications: {
    outline: 'notifications-outline',
    filled: 'notifications',
    labelKey: 'nav.notifications',
    fallbackLabel: 'Notifications',
  },
  profile: {
    outline: 'person-outline',
    filled: 'person',
    labelKey: 'nav.profile',
    fallbackLabel: 'Profile',
  },

  // Booth Staff
  farmers: {
    outline: 'people-outline',
    filled: 'people',
    labelKey: 'nav.farmers',
    fallbackLabel: 'Farmers',
  },
  'record-milk': {
    outline: 'create-outline',
    filled: 'create',
    labelKey: 'nav.recordMilk',
    fallbackLabel: 'Record Milk',
  },
  'review-collection': {
    outline: 'receipt-outline',
    filled: 'receipt',
    labelKey: 'nav.receipts',
    fallbackLabel: 'Receipts',
  },
  'sent-receipts': {
    outline: 'send-outline',
    filled: 'send',
    labelKey: 'nav.receipts',
    fallbackLabel: 'Receipts',
  },

  // BMC Staff
  'receive-milk': {
    outline: 'cube-outline',
    filled: 'cube',
    labelKey: 'nav.deliveries',
    fallbackLabel: 'Deliveries',
  },
  'daily-summary': {
    outline: 'document-text-outline',
    filled: 'document-text',
    labelKey: 'nav.verifyMilk',
    fallbackLabel: 'Verify Milk',
  },
  investigations: {
    outline: 'alert-circle-outline',
    filled: 'alert-circle',
    labelKey: 'nav.alerts',
    fallbackLabel: 'Alerts',
  },

  // Union Management
  'bmc-monitoring': {
    outline: 'grid-outline',
    filled: 'grid',
    labelKey: 'nav.bmcs',
    fallbackLabel: 'BMCs',
  },
  'receipt-review': {
    outline: 'document-text-outline',
    filled: 'document-text',
    labelKey: 'nav.reports',
    fallbackLabel: 'Reports',
  },
  discrepancies: {
    outline: 'warning-outline',
    filled: 'warning',
    labelKey: 'nav.alerts',
    fallbackLabel: 'Alerts',
  },

  // Veterinarian
  'cattle-registry': {
    outline: 'paw-outline',
    filled: 'paw',
    labelKey: 'nav.cattle',
    fallbackLabel: 'Cattle',
  },
  'treatment-entry': {
    outline: 'medkit-outline',
    filled: 'medkit',
    labelKey: 'nav.treatments',
    fallbackLabel: 'Treatments',
  },
  'examination-entry': {
    outline: 'pulse-outline',
    filled: 'pulse',
    labelKey: 'nav.followUps',
    fallbackLabel: 'Follow-ups',
  },

  // Admin
  verifications: {
    outline: 'checkbox-outline',
    filled: 'checkbox',
    labelKey: 'nav.verifications',
    fallbackLabel: 'Verifications',
  },
  'demo-settings': {
    outline: 'settings-outline',
    filled: 'settings',
    labelKey: 'nav.demoSettings',
    fallbackLabel: 'Settings',
  },
  users: {
    outline: 'people-outline',
    filled: 'people',
    labelKey: 'nav.users',
    fallbackLabel: 'Users',
  },
};

export interface FloatingAavinTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
}

export function FloatingAavinTabBar({
  state,
  descriptors,
  navigation,
}: FloatingAavinTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isScrolled } = useScroll();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Filter to only routes that have a registered icon and not hidden
  const visibleRoutes = (state.routes || []).filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    if (options.href === null) return false;
    return Boolean(ROUTE_META_MAP[route.name]);
  });

  const totalTabs = visibleRoutes.length || 5;

  // Active index among visible tabs
  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((r: any) => r.key === activeRoute?.key)
  );

  // Bar layout measurement
  const screenWidth = Dimensions.get('window').width;
  const horizontalMargin = 16;
  const initialBarWidth = Math.max(280, screenWidth - horizontalMargin * 2);
  const [barWidth, setBarWidth] = useState(initialBarWidth);

  const itemWidth = barWidth / totalTabs;
  const initialX = (activeVisibleIndex + 0.5) * itemWidth;

  const animatedX = useRef(new Animated.Value(initialX)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;
  const [currentX, setCurrentX] = useState(initialX);

  // Track keyboard events to hide bar during text entry
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Sync listener for animated SVG path rendering
  useEffect(() => {
    const listenerId = animatedX.addListener(({ value }) => {
      setCurrentX(value);
    });
    return () => {
      animatedX.removeListener(listenerId);
    };
  }, [animatedX]);

  // Animate position and scale when activeVisibleIndex changes
  useEffect(() => {
    if (barWidth > 0 && totalTabs > 0) {
      const targetX = (activeVisibleIndex + 0.5) * (barWidth / totalTabs);

      Animated.parallel([
        Animated.spring(animatedX, {
          toValue: targetX,
          tension: 68,
          friction: 10,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(animatedScale, {
            toValue: 0.88,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.spring(animatedScale, {
            toValue: 1,
            friction: 5,
            tension: 85,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [activeVisibleIndex, barWidth, totalTabs]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const measuredWidth = e.nativeEvent.layout.width;
    if (measuredWidth > 0 && Math.abs(measuredWidth - barWidth) > 1) {
      setBarWidth(measuredWidth);
      const targetX = (activeVisibleIndex + 0.5) * (measuredWidth / totalTabs);
      animatedX.setValue(targetX);
      setCurrentX(targetX);
    }
  };

  if (isKeyboardVisible) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 12);
  const pathData = getCurvedBarPath(barWidth, TAB_BAR_HEIGHT, currentX);

  // Active item metadata
  const currentActiveRoute = visibleRoutes[activeVisibleIndex];
  const activeMeta = currentActiveRoute
    ? ROUTE_META_MAP[currentActiveRoute.name] || {
        outline: 'ellipse-outline',
        filled: 'ellipse',
        labelKey: '',
        fallbackLabel: currentActiveRoute.name,
      }
    : null;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          bottom: bottomOffset,
          marginHorizontal: horizontalMargin,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.barWrapper,
          { height: TAB_BAR_HEIGHT },
          isScrolled && styles.barWrapperScrolled,
        ]}
        onLayout={onBarLayout}
      >
        {/* SVG Curved Notch Background */}
        <Svg
          width={barWidth}
          height={TAB_BAR_HEIGHT}
          style={styles.svgBackground}
        >
          <Path d={pathData} fill={AAVIN_COLORS.white} />
        </Svg>

        {/* Floating Raised Circle for Active Tab */}
        <Animated.View
          style={[
            styles.floatingCircleWrapper,
            {
              left: currentX - BUTTON_SIZE / 2,
              transform: [{ scale: animatedScale }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[AAVIN_COLORS.headerBg, AAVIN_COLORS.headerBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.floatingCircle,
              isScrolled && styles.floatingCircleScrolled,
            ]}
          >
            {activeMeta && (
              <Ionicons
                name={activeMeta.filled}
                size={26}
                color={AAVIN_COLORS.white}
              />
            )}
          </LinearGradient>
        </Animated.View>

        {/* Five Tab Touch Targets & Content */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const isFocused = index === activeVisibleIndex;
            const options = descriptors[route.key]?.options || {};
            const meta = ROUTE_META_MAP[route.name] || {
              outline: 'ellipse-outline',
              filled: 'ellipse',
              labelKey: '',
              fallbackLabel: (options.title as string) || route.name,
            };

            const label = meta.labelKey
              ? t(meta.labelKey, meta.fallbackLabel)
              : (options.title as string) || meta.fallbackLabel;

            const onPress = () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                testID={`tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
              >
                {/* Render only the icon: inactive items show outline icon; active item is elevated in the circle */}
                <View style={styles.iconContainer}>
                  {!isFocused && (
                    <Ionicons
                      name={meta.outline}
                      size={25}
                      color={AAVIN_COLORS.secondaryText}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barWrapper: {
    width: '100%',
    position: 'relative',
    // Shadow styling matching dairy/clean executive aesthetic
    ...Platform.select({
      ios: {
        shadowColor: AAVIN_COLORS.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {
        boxShadow: '0px 6px 18px rgba(18, 52, 81, 0.12)',
        transition: 'box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    }),
  },
  barWrapperScrolled: {
    ...Platform.select({
      ios: {
        shadowColor: AAVIN_COLORS.navy,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      default: {
        boxShadow: '0px 12px 32px rgba(18, 52, 81, 0.24), 0px 4px 14px rgba(94, 168, 238, 0.20)',
        transform: 'translateY(-2px)',
      },
    }),
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  floatingCircleWrapper: {
    position: 'absolute',
    top: -20,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 4,
    borderColor: AAVIN_COLORS.white,
    backgroundColor: AAVIN_COLORS.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: AAVIN_COLORS.headerBg,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0px 6px 14px rgba(94, 168, 238, 0.45)',
        transition: 'box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    }),
  },
  floatingCircleScrolled: {
    ...Platform.select({
      ios: {
        shadowColor: AAVIN_COLORS.headerBg,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.62,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      default: {
        boxShadow: '0px 8px 24px rgba(94, 168, 238, 0.65), 0px 3px 8px rgba(10, 56, 113, 0.22)',
      },
    }),
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
