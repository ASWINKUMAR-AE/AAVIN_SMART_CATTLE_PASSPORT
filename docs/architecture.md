# Current architecture

The unchanged Expo frontend calls a Django REST Framework API on port 4000. Django stores authentication accounts in the separate cloud PostgreSQL database `aavin`, connecting with SSL required.

`backend/config/` contains settings, URL routing, and WSGI/ASGI entry points. `backend/accounts/` contains the custom phone-based user model, serializers, authentication endpoints, Admin forms, and tests. Schema changes use Django migrations.

The four account roles are Union, BMC, Society, and Farmer. Account parent relationships are Union → BMC → Society → Farmer. Each account has one parent, except Union accounts. No child-count limit applies. The creator is tracked separately from the parent because a Union may create a Society beneath one of its BMC accounts.

Django hashes passwords. JWT access tokens protect account creation and current-user lookup. Refresh-token blacklisting supports revocation. Registration checks role permissions and parent ownership on the server, and only manually created Union accounts form the root of the hierarchy.

The frontend remains unchanged, including local demo storage and previous role names. The `society` role needs a future frontend integration change before its authenticated dashboard routing is supported. The previous milk, cattle, logistics, payment, and AI APIs are archived in `legacy/node-backend/`; they are not exposed by this initial Django authentication backend.
