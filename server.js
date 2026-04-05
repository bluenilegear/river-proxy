const express = require('express');
const cors = require('cors');
const https = require('https');
const iconv = require('iconv-lite');

const app = express();
app.use(cors());

function fetchFromRiver(path, res) {
  const options = {
    hostname: 'www1.river.go.jp',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en-US;q=0.9',
      'Referer': 'https://www1.river.go.jp/',
    }
  };
  const request = https.request(options, (r) => {
    const chunks = [];
    r.on('data', chunk => chunks.push(chunk));
    r.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (path.endsWith('.dat')) {
        const text = iconv.decode(buf, 'Shift_JIS');
        res.set('Content-Type', 'text/plain; charset=UTF-8');
        res.send(text);
      } else {
        const text = iconv.decode(buf, 'EUC-JP');
        res.set('Content-Type', 'text/html; charset=UTF-8');
        res.send(text);
      }
    });
  });
  request.on('error', (e) => res.status(500).send(e.message));
  request.end();
}

function fetchFromKawabou(path, res) {
  const options = {
    hostname: 'www.river.go.jp',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json,*/*',
      'Accept-Language': 'ja,en-US;q=0.9',
      'Referer': 'https://www.river.go.jp/',
    }
  };
  const request = https.request(options, (r) => {
    const chunks = [];
    r.on('data', chunk => chunks.push(chunk));
    r.on('end', () => {
      const buf = Buffer.concat(chunks);
      const text = buf.toString('utf-8');
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(text);
    });
  });
  request.on('error', (e) => res.status(500).send(e.message));
  request.end();
}

// 国土交通省 水文水質DB ルート
app.get('/river-data', (req, res) => {
  const { ID, BGNDATE, ENDDATE } = req.query;
  const path = `/cgi-bin/DspWaterData.exe?KIND=1&ID=${ID}&BGNDATE=${BGNDATE}&ENDDATE=${ENDDATE}&KAWABOU=NO`;
  fetchFromRiver(path, res);
});

app.use('/river', (req, res) => {
  fetchFromRiver(req.url, res);
});

app.use('/dat', (req, res) => {
  fetchFromRiver('/dat' + req.url, res);
});

app.use('/html', (req, res) => {
  fetchFromRiver('/html' + req.url, res);
});

// 川の防災情報 現在時刻
app.get('/kawabou-time', (req, res) => {
  fetchFromKawabou('/kawabou/file/system/rwCrntTime.json', res);
});

// 川の防災情報 観測データ
app.get('/kawabou-obs/:date/:time/:twn', (req, res) => {
  const { date, time, twn } = req.params;
  fetchFromKawabou(`/kawabou/file/gjson/obs/${date}/${time}/stg/${twn}.json`, res);
});

// 川の防災情報 観測所マスタ
app.get('/kawabou-master/:fcd', (req, res) => {
  const { fcd } = req.params;
  fetchFromKawabou(`/kawabou/file/files/master/obs/stg/${fcd}.json`, res);
});

// 川の防災情報 時系列データ
app.get('/kawabou-tmlist/:date/:time/:fcd', (req, res) => {
  const { date, time, fcd } = req.params;
  fetchFromKawabou(`/kawabou/file/files/tmlist/stg/${date}/${time}/${fcd}.json`, res);
});

// ポートはRenderが自動設定するPORT環境変数を使う
const PORT = process.env.PORT || 8080;
app.get('/kawabou-prefobs/:date/:time/:pref', (req, res) => {
  const { date, time, pref } = req.params;
  fetchFromKawabou(`/kawabou/file/files/overobs/pref/${date}/${time}/${pref}.json`, res);
});
// 全国水位観測所一覧（地図用）
app.get('/kawabou-allobs/:date/:time', (req, res) => {
  const { date, time } = req.params;
  fetchFromKawabou(`/kawabou/file/gjson/overobs/stg/${date}/${time}/over-obs-create.json`, res);
});
// 市区町村別 水位観測所一覧（地図用）
app.get('/kawabou-swstg/:date/:time/:twnCd', (req, res) => {
  const { date, time, twnCd } = req.params;
  fetchFromKawabou(`/kawabou/file/gjson/obs/${date}/${time}/swstg/${twnCd}.json`, res);
});
app.listen(PORT, () => {
  console.log(`プロキシサーバー起動中: port ${PORT}`);
});
