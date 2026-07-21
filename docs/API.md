# REST API Documentation

## Endpoints Summary

### Groups API
- `GET /api/groups` - List groups (filterable by wallet or group ID).
- `POST /api/groups` - Create new group with initial members.
- `PUT /api/groups` - Update group or add/remove member (`action: "addMember"` / `"removeMember"`).
- `DELETE /api/groups?id=...` - Delete group by ID.

### Expenses API
- `GET /api/expenses` - Fetch group expenses.
- `POST /api/expenses` - Create expense record.
- `PUT /api/expenses` - Edit expense.
- `DELETE /api/expenses?id=...` - Delete expense.

### Payments & Settlements API
- `GET /api/payments` - Fetch payment settlements.
- `POST /api/payments` - Record settlement transaction.
- `PUT /api/payments` - Update payment status (`Paid`, `Completed`).

### Money Requests API
- `GET /api/requests` - Fetch money requests.
- `POST /api/requests` - Create money request or direct loan.
- `PUT /api/requests` - Update request status (`Accepted`, `Rejected`, `Paid`, `Completed`).

### Health & Monitoring API
- `GET /api/health` - Basic server health check.
- `GET /api/status` - Subsystem status overview.
- `GET /api/version` - App build version metadata.
- `GET /api/indexer/status` - Indexer status.
- `GET /api/database/status` - Database storage metrics.
- `GET /api/contracts/status` - Soroban contract status.
