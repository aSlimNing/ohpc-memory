const express = require('express');
const cookie = require('cookie');
const app = express();
app.get('/hello', (req, res) => {
  res.json({
    runtime: 'official node native ohos',
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    pid: process.pid,
    uptime: process.uptime().toFixed(2) + 's'
  });
});
app.get('/cookie', (req, res) => {
  res.setHeader('set-cookie', cookie.stringifyCookie({ name: 'sid', value: 'abc123', options: { httpOnly: true, path: '/' } }));
  res.send('cookie set');
});
app.listen(18099, '127.0.0.1', () => console.log('express listening on 18099, platform=', process.platform));
