const fetch = require('node-fetch');

async function testRegistration() {
  const payload = {
    university: {
      name: "Test University " + Math.random(),
      domain: "test-" + Math.random() + ".edu",
      location: "Test Location"
    },
    admin: {
      name: "Test Admin",
      email: "admin-" + Math.random() + "@test.edu",
      password: "password123",
      face_embedding: Array.from({ length: 128 }, () => Math.random())
    }
  };

  try {
    const res = await fetch('http://localhost:3000/api/auth/register-university', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

testRegistration();
