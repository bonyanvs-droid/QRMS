async function main() {
  const url = 'https://qrms-dev.schoolscreen.sa/api/health';
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Basic cXJtc2RldjpmMVNvTTZLY1AyQVhZeWFhelQ0TA==',
        'Accept': 'application/json, text/html'
      }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body snippet:', body.slice(0, 1000));
  } catch (err) {
    console.error(err);
  }
}
main();
