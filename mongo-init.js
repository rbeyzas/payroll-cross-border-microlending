// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the liquid-auth database
db = db.getSiblingDB("liquid-auth");

// Create the algorand user for the liquid-auth database
db.createUser({
  user: "algorand",
  pwd: "algorand",
  roles: [
    {
      role: "readWrite",
      db: "liquid-auth",
    },
  ],
});

// Create some initial collections if needed
db.createCollection("users");
db.createCollection("sessions");
db.createCollection("challenges");

print("MongoDB initialization completed successfully!");
print("Database: liquid-auth");
print("User: algorand");
print("Password: algorand");
