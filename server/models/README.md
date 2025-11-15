# Firestore Data Structure

Firestore organizes data in a simple hierarchy:
Collection → Document → Fields

Example:

users (collection)
├─ user1 (document)
│   ├─ name: "Bronte"
│   └─ email: "bronte@example.com"
├─ user2 (document)
│   ├─ name: "Alice"
│   └─ email: "alice@example.com"


------------------------------------------------------------------------------------------------------------------------
# Handling an Empty Database

Firestore handles empty databases: collections don’t need to exist beforehand. You can check for empty collections like this:

```js
const snapshot = await db.collection("users").get();

if (snapshot.empty) {
  console.log("No users found");
} else {
  snapshot.docs.forEach(doc => console.log(doc.id, doc.data()));
}
```
----------------------------------------------------------------------------------------------------------------------------
### Adding Data to an Empty DB
```js
await db.collection("users").add({
  name: "Bronte",
  email: "bronte@example.com"
});
```

> Firestore will automatically create the `users` collection if it doesn’t exist.
> No setup is needed — first write = first collection/document creation.

--------------------------------------------------------------------------------------------------------------------------
# Best Practices for an Empty DB

1. **Check for empty snapshots** before iterating to avoid undefined errors.
2. **Initialize default data** if your app requires starting content:

```js
const snapshot = await db.collection("settings").get();

if (snapshot.empty) {
  await db.collection("settings").add({ theme: "light", version: 1 });
}
```

3. **Use `try/catch`** for any Firestore operation to handle network or permission issues:

try {
  // Firestore operation here
} catch (error) {
  console.error("Firestore error:", error.message);
}
