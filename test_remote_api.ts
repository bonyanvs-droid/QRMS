import { config } from './server/config/env';

async function main() {
  const remoteUrl = 'https://qrms-dev.schoolscreen.sa/api';
  const token = 'cXJtc2RldjpmMVNvTTZLY1AyQVhZeWFhelQ0TA=='; // Basic auth token for qrmsdev:f1SoM6KcP2AXYyaazT4L
  
  console.log('Fetching health from:', `${remoteUrl}/health`);
  try {
    const healthRes = await fetch(`${remoteUrl}/health`, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log('Health Status:', healthRes.status);
    const healthData = await healthRes.json();
    console.log('Health Data:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error('Health Fetch Failed:', error);
  }

  console.log('Fetching users from:', `${remoteUrl}/users`);
  try {
    const usersRes = await fetch(`${remoteUrl}/users`, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json',
        'X-Tenant-Id': 'tenant_1789346881267'
      }
    });
    console.log('Users Status:', usersRes.status);
    const usersData = await usersRes.json();
    console.log('Users Count in tenant_1789346881267:', Array.isArray(usersData.data) ? usersData.data.length : 'unknown', usersData);
  } catch (error) {
    console.error('Users Fetch Failed:', error);
  }
}

main();
