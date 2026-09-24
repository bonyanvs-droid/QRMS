import assert from 'assert';

async function testLogin() {
  console.log('Testing login endpoint on local port 3000...');
  
  const payload = {
    identifier: '0540647097', // هيثم الحارثي أبو عمر
    password: 'Admin@123456'
  };

  try {
    const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`Response Status: ${res.status}`);
    const data: any = await res.json();
    console.log('Response JSON:', JSON.stringify(data, null, 2));

    if (data.ok) {
      console.log('✅ Login Test Succeeded!');
    } else {
      console.error('❌ Login Test Failed:', data.error || data.message);
    }
  } catch (err: any) {
    console.error('❌ Error testing login:', err.message || err);
  }
}

testLogin();
