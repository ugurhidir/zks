# Backend

This is the backend for the visitor registration system.

## Security Recommendations

### HTTPS

In a production environment, it is strongly recommended to use a reverse proxy like Nginx to handle HTTPS. This will encrypt all communication between the client and the server, protecting sensitive data like passwords and JWTs.

### Environment Variables

The application uses a `.env` file to store sensitive information like the JWT secret and admin credentials. Make sure to create a `.env` file in the `backend` directory and add the following variables:

```
JWT_SECRET=<your-secure-random-string>
ADMIN_USERNAME=<your-admin-username>
ADMIN_PASSWORD=<your-admin-password>
```

### Production Mode

For production, it is recommended to use a process manager like `pm2` to run the application. This will ensure that the server restarts automatically if it crashes.

```
npm install -g pm2
pm2 start index.js
```
