# To add a new member to the project, hit this route with the user email in the body
```bash
POST /api/projects/:projectId/members/add
```
# To make a member an admin, hit this route with the userId in the body
```bash
PATCH /api/projects/:projectId/members/role/make-admin
```
# To remove an admin, hit this route with the userId in the body
```bash
PATCH /api/projects/:projectId/members/role/remove-admin
```
