# 🌍 Civic Resolve

**Civic Resolve** is a full-stack web application designed for **civic issue reporting, tracking, and resolution**. It bridges the gap between **citizens** and **administrators**, offering transparency, accountability, and data-driven governance.  

The project is divided into two main layers:  
- **Frontend**: A citizen- and admin-facing interface built with modern web standards.  
- **Backend**: A powerful, secure engine handling authentication, complaint lifecycle management, notifications, and analytics.  

---
## 🎥 Demo & Resources

- 🎬 Demo Video: [Watch Here](https://youtu.be/A14E4agoPgc?si=h_zh10WJmQEOZAqk)
- 🌐 Deployed Site: [Visit Here](https://civic-resolve.vercel.app)
- 📊 Project PPT: [View Presentation](https://drive.google.com/drive/folders/1j9cWQajplBm8EECQQQMokfYjYIVu8C_m?usp=sharing)

---

## 👥 Team Members  

| Name                | Roll No.     | Role                  |
|---------------------|--------------|-----------------------|
| **Devyansh Dingolia** | 2024UCS1537 | Full-Stack Developer  |
| **Janardhan Verma**   | 2024UCS1538 | Backend Developer     |
| **Yash Kumar**        | 2024UCS1535 | Frontend Developer    |
| **Manish Mandia**     | 2024UCS1576 | Frontend Developer    |
| **Sakshi Yadav**      | 2024UCS1575 | Backend Developer     |
| **Bhardwaj Kartikey** | 2024UCS1539 | AI/ML Engineer        |

---

## 📂 Project Structure  
```
civic-resolve/
│  
├── frontend/User & admin interfaces (HTML,CSS,JS)
│ ├── index.html # Landing page
│ ├── new-complaint.html # Complaint submission wizard
│ ├── my-complaints.html # Citizen complaint tracker
│ ├── near-me.html # Local services (maps)
│ ├── admin-dashboard.html # Admin overview dashboard
│ ├── complaints.html # Admin complaint management
│ ├── js/ # API client & custom scripts
│ └── style/ # CSS stylesheets
│
├── backend/ # Core application logic (Node.js + Express)
│ └── src/
│ ├── controllers/ # API controllers
│ ├── models/ # MongoDB schemas
│ ├── routes/ # REST endpoints
│ ├── middlewares/ # Security & upload middleware
│ └── utils/ # Helpers (email, cloud, analytics)
│
└── README.md # Project documentation
```



---

## 🎨 1. Frontend: A User-Centric Interface  

The frontend provides **distinct experiences for citizens and administrators**.  

### 👤 Citizen Experience  
- **Main Website (`index.html`)** → Landing page with mission, features, and helplines. Includes a **chatbot assistant**.  
- **Complaint Submission (`new-complaint.html`)** → Multi-step guided form with:  
  - Photo & audio upload  
  - Category selection  
  - Location pinning on an interactive map  
- **Issue Tracking (`my-complaints.html`)** → Track submitted complaints with live status, priority, and history.  
- **Local Services (`near-me.html`)** → Map-based discovery of nearby police stations, hospitals, and emergency services.  

### 🛡️ Administrator Experience  
- **Dashboard (`admin-dashboard.html`)** → Overview with charts for:  
  - Complaint categories  
  - Resolution performance  
  - Pending vs resolved counts  
- **Complaint Management (`complaints.html`)** → Tools for:  
  - Filtering by status/category  
  - Viewing complaint details  
  - Updating status or assigning to departments  

---

## ⚙️ 2. Backend: The Power and Security Engine  

The backend is the **intelligent core** of the project, built with **Node.js + Express.js**. It manages all data, authentication, complaint workflows, and system automation.  

### 🔑 Core Functionalities  
- **User Management**  
  - Secure registration/login with hashed passwords (`bcrypt`).  
  - JWT-based authentication with **access & refresh tokens**.  
  - Cryptographic email-based password reset.  

- **Complaint Lifecycle**  
  - New complaint stored in MongoDB with an entry in `ReportHistory`.  
  - Admins can update status, assign departments, or upload resolution images.  
  - Every change logged with timestamp + user ID for auditing.  

### 🔒 Backend-Only Technicalities  
- **Role-Based Access Control (RBAC)**  
  - Middleware (`isAdmin`, `isSuperAdmin`, `isDepartmentAdmin`) enforces permissions.  
  - Prevents unauthorized actions by regular users.  

- **Automated Cron Jobs**  
  - Run every 15 minutes.  
  - Detect complaints pending >48 hours.  
  - Send **emails + in-app notifications** to officials.  

- **File & Media Handling**  
  - `multer` middleware validates uploads (size & type).  
  - Files stored in **Cloudinary**; local temp files auto-deleted.  

- **Analytics Engine**  
  - MongoDB aggregation pipelines compute:  
    - Total complaints  
    - Average resolution time  
    - Department performance  
  - Metrics update automatically on report changes.  

---

## 👣 Typical Workflow  

1. **Citizen Onboarding**  
   - Register/login → JWT tokens issued.  
   - Passwords securely hashed.  

2. **Complaint Filing**  
   - Citizen submits complaint with media + location.  
   - Stored in DB → logged in `ReportHistory`.  

3. **Admin Management**  
   - Admin views complaints, updates status, assigns departments.  
   - Immutable audit logs maintained.  

4. **Automated Oversight**  
   - Cron jobs flag overdue complaints.  
   - Notifications ensure accountability.  

5. **Citizen Tracking**  
   - Citizens check status via "My Complaints".  
   - Resolution history always accessible.  

---

## 🛠️ Tech Stack  

**Frontend**  
- HTML, CSS, JavaScript  
- Role-based dashboards  
- Interactive maps & chatbot  

**Backend**  
- Node.js, Express.js  
- MongoDB + Mongoose  
- JWT, bcrypt  
- Multer + Cloudinary  
- Node-cron (schedulers)  
- Nodemailer (emails)  

---
