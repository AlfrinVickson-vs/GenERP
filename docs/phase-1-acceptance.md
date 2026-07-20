# Phase 1 Acceptance Notes

Phase 1 is complete when:

- Admin can login with seeded credentials.
- API rejects unauthenticated protected requests.
- API rejects authenticated users without required permissions.
- Admin can read and update company settings.
- Admin can manage branches, departments, warehouses, roles, and users.
- Security and administrative actions generate audit log entries.
- Dashboard values are read from database counts and audit/login activity.
- Web application shows login, navigation, branch selector, notification entry point, dashboard cards, setup lists, users, roles, and audit log.
- Docker Compose can start PostgreSQL and Redis dependencies.
- Tests pass for permission matching, password hashing, and authentication service behavior.
