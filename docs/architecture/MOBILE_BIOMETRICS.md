# Mobile Biometrics

## Role
Local unlock of an **already valid** session. Does **not** replace server auth.

## Behavior
- Opt-in only (never auto-enable)
- Face ID / Touch ID / Android biometrics via `expo-local-authentication`
- Fail / cancel / lockout handled with friendly messages
- On session expired/revoked → full login required
- Password never stored

## iOS
`NSFaceIDUsageDescription` in app.config.ts

## Windows limitation
Contracts + Android QA when device available; iOS readiness static until Mac/EAS install.
