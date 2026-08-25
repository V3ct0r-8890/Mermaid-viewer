/**
     * Mermaid Visual Editor & Offline Viewer
     * Complete Offline Single-File Implementation with Multi-Diagram Visual Suite
     */

    // --- VERIFIED OFFICIAL MERMAID DIAGRAM TEMPLATES ---
    const DIAGRAM_TEMPLATES = [
      {
        id: 'flowchart_td',
        name: 'Flowchart (Top-Down)',
        badge: 'flowchart TD',
        desc: 'Multi-tier system architecture & workflow',
        code: `flowchart TD
  Client["Client App"] -->|"HTTP Request"| API["API Gateway"]
  API -->|"Verify"| Auth{"Auth Service"}
  API ==>|"Query Data"| Database(("PostgreSQL DB"))`
      },
      {
        id: 'flowchart_lr',
        name: 'Flowchart (Left-Right)',
        badge: 'flowchart LR',
        desc: 'Horizontal sequential data processing pipeline',
        code: `flowchart LR
  Start([Start]) --> Process["Process Input"]
  Process --> Validate{"Is Valid?"}
  Validate -->|Yes| Output[("Save Record")]
  Validate -->|No| Reject["Reject with Error"]`
      },
      {
        id: 'sequence',
        name: 'Sequence Diagram',
        badge: 'sequenceDiagram',
        desc: 'Actor & microservice request/response flow over time',
        code: `sequenceDiagram
  autonumber
  actor User as User
  participant App as Web App
  participant API as API Server
  participant DB as Database

  User->>App: Click Checkout
  App->>API: POST /api/orders
  API->>DB: INSERT INTO orders
  DB-->>API: 1 row affected (ID: 1042)
  API-->>App: 201 Created (Order #1042)
  App-->>User: Show Order Confirmation`
      },
      {
        id: 'classDiagram',
        name: 'Class Diagram',
        badge: 'classDiagram',
        desc: 'OOP class models, attributes, methods, inheritance',
        code: `classDiagram
  class BankAccount {
    +String owner
    +Decimal balance
    +deposit(amount)
    +withdraw(amount)
  }
  class SavingsAccount {
    +Decimal interestRate
    +addInterest()
  }
  class CheckingAccount {
    +Decimal overdraftLimit
  }
  BankAccount <|-- SavingsAccount
  BankAccount <|-- CheckingAccount`
      },
      {
        id: 'stateDiagram',
        name: 'State Diagram (v2)',
        badge: 'stateDiagram-v2',
        desc: 'Choice conditions, concurrent active states, power modes',
        code: `stateDiagram-v2
    state battery_check <<choice>>
    [*] --> PowerOn
    PowerOn --> battery_check
    battery_check --> LowPowerMode : battery < 20%
    battery_check --> Active : battery >= 20%

    state Active {
        [*] --> Playing
        Playing --> Paused : pause
        Paused --> Playing : play
        --
        [*] --> ScreenOn
        ScreenOn --> ScreenDimmed : idle 30s
        ScreenDimmed --> ScreenOn : touch
    }

    LowPowerMode --> [*] : power off
    Active --> [*] : power off`
      },
      {
        id: 'erDiagram',
        name: 'Entity Relationship (ER)',
        badge: 'erDiagram',
        desc: 'Database schemas, keys, foreign cardinality',
        code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : included_in
  CUSTOMER {
    int id PK
    string name
    string email
  }
  ORDER {
    int id PK
    int customer_id FK
    date order_date
    decimal total_amount
  }
  ORDER_ITEM {
    int id PK
    int order_id FK
    int product_id FK
    int quantity
  }
  PRODUCT {
    int id PK
    string name
    decimal price
  }`
      },
      {
        id: 'gantt',
        name: 'Gantt Roadmap',
        badge: 'gantt',
        desc: 'Sprint schedules, task timelines, and milestones',
        code: `gantt
  title Project Sprint Roadmap
  dateFormat YYYY-MM-DD
  section Planning
    Architecture Design  :done, p1, 2026-08-01, 2026-08-07
    UX Specifications    :done, p2, 2026-08-05, 2026-08-12
  section Development
    Backend Services     :active, d1, 2026-08-10, 2026-08-25
    Frontend Application :active, d2, 2026-08-14, 2026-08-30
  section QA & Release
    Integration Testing  :crit, q1, 2026-08-26, 2026-09-05
    Production Launch    :milestone, m1, 2026-09-06, 0d`
      },
      {
        id: 'pie',
        name: 'Pie Chart',
        badge: 'pie',
        desc: 'Proportions and percentage data distributions',
        code: `pie title Cloud Infrastructure Resource Distribution
  "Compute Engine (VMs)" : 42
  "Cloud Storage (GCS)" : 28
  "BigQuery Analytics" : 18
  "Networking & CDN" : 12`
      },
      {
        id: 'gitGraph',
        name: 'Git Version Graph',
        badge: 'gitGraph',
        desc: 'Branches, commits, merges, and release tags',
        code: `gitGraph
  commit id: "Initial Commit"
  commit id: "Core Foundation"
  branch feature/canvas
  checkout feature/canvas
  commit id: "Add SVG Engine"
  commit id: "Add Inspector"
  checkout main
  merge feature/canvas id: "Merge Canvas"
  branch release/v1.0
  checkout release/v1.0
  commit id: "Bump v1.0.0" tag: "v1.00.000"
  checkout main
  merge release/v1.0 id: "Release 1.0"`
      },
      {
        id: 'journey',
        name: 'User Journey Map',
        badge: 'journey',
        desc: 'Customer satisfaction scores across touchpoints',
        code: `journey
  title E-Commerce Customer Journey
  section Discovery
    Search Products: 5: Customer
    View Product Details: 4: Customer
  section Purchase
    Add to Cart: 4: Customer
    Checkout & Payment: 3: Customer, Stripe
  section Fulfillment
    Order Notification: 5: Email Service
    Package Delivery: 5: Courier, Customer`
      },
      {
        id: 'mindmap',
        name: 'Mindmap',
        badge: 'mindmap',
        desc: 'Hierarchical concept mapping & multi-tier tree',
        code: `mindmap
  root((System Architecture))
    Client Layer
      Web Application
        React Frontend
        Vite Bundler
      Mobile App
        iOS Swift
        Android Kotlin
    API Gateway
      Authentication
        OAuth2 Flow
        JWT Tokens
      Rate Limiting
    Microservices
      User Service
        Auth DB
      Payment Engine
        Stripe API
    Data Tier
      PostgreSQL
        Primary DB
        Read Replica
      Redis Cache`
      },
      {
        id: 'timeline',
        name: 'Timeline Chart',
        badge: 'timeline',
        desc: 'Chronological timeline of milestones and events',
        code: `timeline
  title Platform Development Timeline
  2024 : Initial Architecture : Prototype Alpha
  2025 : Real-time Collab : Multi-format Exporter
  2026 : Offline Visual Suite : Release 1.0`
      },
      {
        id: 'quadrant',
        name: 'Quadrant Priority Matrix',
        badge: 'quadrantChart',
        desc: '2x2 matrix for urgency vs impact prioritization',
        code: `quadrantChart
  title Engineering Task Prioritization
  x-axis Low Urgency --> High Urgency
  y-axis Low Impact --> High Impact
  quadrant-1 Strategic Bets
  quadrant-2 Urgent & Critical
  quadrant-3 Low Priority
  quadrant-4 Quick Fixes
  "Offline Engine": [0.85, 0.90]
  "Export PNG": [0.75, 0.70]
  "Property Inspector": [0.60, 0.80]
  "Minor Styling": [0.20, 0.30]`
      },
      {
        id: 'c4context',
        name: 'C4 Context Architecture',
        badge: 'C4Context',
        desc: 'Enterprise banking platform context, microservices, cloud DBs & external SaaS rails',
        code: `C4Context
  title Enterprise Cloud Banking & Payments Architecture Platform
  Person(customer, "Banking Customer", "Retail client managing accounts, cards & wire transfers")
  Person(support_agent, "Support Agent", "Bank staff managing KYC verification, disputes & limits")
  Person_Ext(auditor, "Compliance Auditor", "Regulator inspecting audit trails & SAR reports")

  System(api_gateway, "Cloud API Gateway & Auth", "Kong / Envoy edge proxy handling OAuth2, WAF & rate limits")
  System(banking_core, "Core Banking Services", "Spring Boot microservices processing accounts, loans & ledgers")
  SystemDb(primary_db, "Distributed Ledger DB", "Google Cloud Spanner multi-region ACID financial ledger")
  System(event_bus, "Kafka Event Mesh", "Apache Kafka cluster streaming real-time financial events")

  System_Ext(payment_rail, "Stripe & Visa Rails", "External payment clearing networks (SWIFT, FedNow, ACH)")
  System_Ext(fraud_ai, "Fraud Scoring AI", "Real-time ML risk scoring & anomaly detection engine")
  System_Ext(notification_hub, "Multi-Channel Alerts", "Twilio SMS & SendGrid push/email dispatch service")

  Rel(customer, api_gateway, "Accesses mobile banking & portal", "HTTPS / TLS 1.3")
  Rel(support_agent, api_gateway, "Administers customer accounts & overrides", "HTTPS / SSO")
  Rel(auditor, banking_core, "Audits immutable financial records", "SFTP / TLS")
  Rel(api_gateway, banking_core, "Dispatches authorized API calls", "gRPC / mTLS")
  Rel(banking_core, primary_db, "Executes distributed ACID ledger writes", "SQL / TCP")
  Rel(banking_core, event_bus, "Emits transaction & account lifecycle events", "Kafka Protocol")
  Rel(banking_core, payment_rail, "Authorizes interbank clearing & wires", "REST / ISO 8583")
  Rel(event_bus, fraud_ai, "Streams live transaction telemetry for scoring", "gRPC Stream")
  Rel(event_bus, notification_hub, "Triggers transactional SMS, push & receipts", "Kafka Consumer")`
      },
      {
        id: 'sankey',
        name: 'Sankey Flow Diagram',
        badge: 'sankey-beta',
        desc: 'Traffic volume and user conversion flow paths',
        code: `sankey-beta
  Organic Search, Landing Page, 4500
  Social Ads, Landing Page, 3200
  Referrals, Landing Page, 1300
  Landing Page, Signup Form, 5800
  Landing Page, Dropoff, 3200
  Signup Form, Activated Users, 4200
  Signup Form, Abandoned, 1600`
      }
    ];