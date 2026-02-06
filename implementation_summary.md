# UI Revamp: Whitelabeling Support

I have successfully updated the application to support dynamic whitelabeling for the logged-in security company.

## Changes
1.  **Layout Component (`components/Layout.tsx`)**:
    *   Now reads `white_label` settings from the user's Organization.
    *   Dynamically displays the `company_name` and `logo_url`.
    *   Applies the `primary_color` to the company brand text in the sidebar and header.

2.  **Authentication Context (`contexts/AuthContext.tsx`)**:
    *   Updated the demo/mock data to include `white_label` settings for the admin account.
    *   **Try it out**: Log in with `admin@guardian.com` (password: `password123`) to see the new "**AsoRock Security**" branding in action.

## Customization
To customize branding for a real organization, ensure the `white_label` field is populated in their `organizations` Firestore document:
```json
"white_label": {
  "company_name": "My Security Co",
  "logo_url": "https://...",
  "primary_color": "#ff0000"
}
```
