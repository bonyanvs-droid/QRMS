import { spawn } from 'child_process';
import assert from 'assert';

async function runRegressionTest() {
  console.log('=== Running QRMS User Filtering Regression Test ===');
  
  // Set up environment variables
  const env = {
    ...process.env,
    PORT: '3302',
    API_RUNTIME_MODE: 'local-db',
    DATABASE_URL: 'postgresql://qrms_dev:b8fb5ee06e2f90831c6478b06ccd23fe420a5161fc10f002@127.0.0.1:5432/qrms_development'
  };

  // Spawn server process on separate port
  console.log('Spawning test server on port 3302...');
  const server = spawn('node', ['dist/server.cjs'], { env });

  // Stream logs
  server.stdout.on('data', (data) => {
    // console.log(`[Server] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });

  // Wait 3 seconds for server to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const tenantId = 'tenant_1789346881267';

  try {
    // 1. Fetch active users (no archived parameter)
    console.log('Test 1: Requesting active users (isArchived not specified)...');
    const resActive = await fetch(`http://127.0.0.1:3302/api/users?tenantId=${tenantId}`);
    assert.strictEqual(resActive.status, 200, 'Active users endpoint should return 200 OK');
    const dataActive = await resActive.json();
    assert.strictEqual(dataActive.ok, true, 'Response should indicate success');
    
    const activeUsers = dataActive.data || [];
    console.log(`Active users returned: ${activeUsers.length}`);
    
    // Assert all returned users are active and not archived
    for (const u of activeUsers) {
      assert.ok(!u.isArchived, `User ${u.name} (${u.id}) is returned in active users but is archived!`);
    }
    console.log('✅ Test 1 Passed: No archived users returned in default query.');

    // 2. Fetch archived users (isArchived=true)
    console.log('Test 2: Requesting archived users (isArchived=true)...');
    const resArchived = await fetch(`http://127.0.0.1:3302/api/users?tenantId=${tenantId}&isArchived=true`);
    assert.strictEqual(resArchived.status, 200, 'Archived users endpoint should return 200 OK');
    const dataArchived = await resArchived.json();
    assert.strictEqual(dataArchived.ok, true, 'Response should indicate success');
    
    const archivedUsers = dataArchived.data || [];
    console.log(`Archived users returned: ${archivedUsers.length}`);
    
    // Assert all returned users are indeed archived
    for (const u of archivedUsers) {
      assert.ok(u.isArchived, `User ${u.name} (${u.id}) is returned in archived query but is not archived!`);
    }
    console.log('✅ Test 2 Passed: Only archived users returned in archived query.');

    console.log('=== All Regression Tests Passed Successfully! ===');
  } catch (err: any) {
    console.error('❌ Regression Test Failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('Terminating test server...');
    server.kill('SIGINT');
  }
}

runRegressionTest();
