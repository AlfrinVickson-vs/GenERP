# Database Entity Relationship Diagram

```mermaid
erDiagram
  Company ||--o{ Branch : has
  Company ||--o{ Department : has
  Company ||--o{ Warehouse : has
  Company ||--o{ CostCenter : has
  Company ||--o{ User : employs
  Branch ||--o{ Department : contains
  Branch ||--o{ Warehouse : operates
  User ||--o{ UserRole : assigned
  Role ||--o{ UserRole : grants
  Role ||--o{ RolePermission : contains
  Permission ||--o{ RolePermission : included
  User ||--o{ LoginHistory : creates
  User ||--o{ AuditLog : performs
  Company ||--o{ AuditLog : scopes

  Company {
    string id PK
    string name
    string baseCurrency
    string financialYearStartMonth
    string timezone
  }
  User {
    string id PK
    string email UK
    string username UK
    string passwordHash
    string status
    boolean mfaEnabled
  }
  Role {
    string id PK
    string name UK
    boolean isSystem
  }
  Permission {
    string id PK
    string code UK
    string module
    string action
  }
  AuditLog {
    string id PK
    string action
    string module
    string recordType
    datetime createdAt
  }
```

Phase 1 stores organisation, identity, permissions, login history, and audits. Later phases will add master data, document workflows, stock ledger, and double-entry ledger entities.
