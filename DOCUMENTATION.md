# To add a new member to the project, hit this route with the user email in the body

```bash
POST /api/projects/:projectId/members/add
```

## To make a member an admin, hit this route with the userId in the body

```bash
PATCH /api/projects/:projectId/members/role/make-admin
```

## To remove an admin, hit this route with the userId in the body

```bash
PATCH /api/projects/:projectId/members/role/remove-admin
```




# 🧾Tasks API Documentation

This endpoint group enables CRUD operations for project tasks as well as task assignment to team members.

Base URL:

```bash
/api/v1
```

🔐 Auth Required
All routes below require a valid JWT sent in the headers:

```bash
Authorization: Bearer <token>
```

🧪 Schema Overview
Each ```Task``` has the following shape:

```bash
{
  id: string;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  projectId: string;
  createdById: string;
  assignedToId?: string;
  assignedTo?: 
  {
    id: string;
    name?: string;
    email: string;
  }
}
```

📌 1. Create a Task

```bash
POST ```/api/:projectId/tasks```
```

🔒 Roles: OWNER, ADMIN, MEMBER

## Request Body:

```bash
{
  "title": "Design login page",
  "description": "Create wireframes for login",
  "priority": "HIGH",
  "dueDate": "2025-06-15T23:59:00Z"
}
```

## Response: ```201 Created```

```bash
{
  "id": "...",
  "title": "...",
  "status": "TODO",
  ...
}
```

## 📌 2. Get Tasks for a Project

GET /```api/:projectId/tasks```
🔓 Any authenticated member of the project.

## Response: 200 OK

```bash
[
  {
    "id": "...",
    "title": "...",
    "assignedTo": {
      "id": "...",
      "name": "Diri",
      "email": "diri@example.com"
    },
    ...
  },
  ...
]
```

## 📌 3. Update a Task

PUT ```/api/tasks/:taskId```
🔒 Only the task creator can update it.

## Request Body:

```bash
{
  "title": "Updated task title",
  "description": "New description",
  "status": "IN_PROGRESS",
  "priority": "MEDIUM"
}
```

## Response: ```200 OK```

```bash
{
  "id": "...",
  "title": "Updated task title",
  ...
}
```

## 📌 4. Delete a Task

DELETE ```/api/tasks/:taskId```
🔒 Only the task creator can delete it.

## Response: 204 No Content

📌 5. Assign Task to a User
PATCH ```/api/tasks/:taskId/assign```
🔒 Only OWNER or ADMIN can assign.

## Request Body:

```bash
{
  "userId": "id-of-the-user-to-assign"
}
```

## Response: ```200 OK```

```bash
{
"id": "...",
"assignedToId": "id-of-the-user-to-assign"
}
```

## 📌 6. Unassign a Task
PATCH ```/api/tasks/:taskId/unassign```
🔒 Only OWNER or ADMIN can unassign.

## Response: ```200 OK```

```bash
{
"id": "...",
"assignedToId": null
}
```
## 🧠 Notes for Frontend Dev
projectId is a route param — pull it from context or project selection
- Only show Assign/Unassign if user role is OWNER or ADMIN
- Tasks can be filtered/sorted client-side (add server filters later)
- Status options: TODO, IN_PROGRESS, DONE
- Priority options: LOW, MEDIUM, HIGH

## Task endpoints
- POST    /api/v1/projects/:projectId/tasks
- GET     /api/v1/projects/:projectId/tasks
- PUT     /api/v1/projects/:projectId/tasks/:taskId
- DELETE  /api/v1/projects/:projectId/tasks/:taskId
- PATCH   /api/v1/projects/:projectId/tasks/:taskId/assign
- PATCH   /api/v1/projects/:projectId/tasks/:taskId/unassign