import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../../app/(booth)/index';
import Farmers from '../../app/(booth)/farmers';
import Profile from '../../app/(booth)/profile';
import Milk from '../../app/(booth)/record-milk';
import Review from '../../app/(booth)/review-collection';
import Receipt from '../../app/(booth)/receipt-preview';
import Sent from '../../app/(booth)/sent-receipts';
import { BoothTabBar } from '../../components/booth/BoothTabBar';
const screen = new URLSearchParams(location.search).get('screen') || 'home';
const Page = { home: Home, farmers: Farmers, profile: Profile, milk: Milk, review: Review, receipt: Receipt, sent: Sent }[screen];
const routes = ['index', 'farmers', 'record-milk', 'profile', 'review-collection', 'sent-receipts', 'receipt-preview']
  .map(name => ({ name, key: name }));
const descriptors = Object.fromEntries(routes.map(route => [route.key, { options: {
  tabBarItemStyle: ['review-collection', 'sent-receipts', 'receipt-preview'].includes(route.name) ? { display: 'none' } : undefined,
} }]));
createRoot(document.getElementById('root')).render(<><Page /><BoothTabBar state={{ routes, index: 0 }}
  descriptors={descriptors} navigation={{ emit: () => ({ defaultPrevented: false }), navigate: () => {} }} /></>);
