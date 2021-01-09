# mekiku-web

Webブラウザ上で要約筆記（Subtitling on the web）

## 使うには (To use it now)

https://sksthrs.github.io/mekiku-web/dist/

## 注意点 (Notice)

IEおよび古いMicrosoft Edgeでは動作しません。将来的にも対応はしません。なお、新しいEdge（Chromium版、アイコンが緑〜青のグラデーションのもの）では動作します。  
(IE and older version of Microsoft Edge are not supported. Newer version of Microsoft Edge (Chromium-based, with green-blue icon) is supported.)

## 自分のサーバで使う場合 (Use mekiku-web on your server)

リポジトリをクローンし、dist/config.jsonのうち少なくとも"api_key"をあなたのskyway APIキーで上書きし、distディレクトリ以下をHTTPS対応のサーバに配置してください。
(Clone this repository, rewrite dist/config.json (at least "api_key" with your skyway API key),  upload files in dist directory onto your HTTPS-supported server, and access there.)

## 設定について (Configuration)

`dist/config.json`

```json
{
  "api_key" : "your SkyWay API KEY",
  "debug_level" : 2,
  "auth_url" : "browser"
}
```

### debug_level

- NONE : 0
- ERROR : 1
- WARN : 2
- FULL : 3

See Peer constructor -> Parameter -> options -> debug
https://webrtc.ecl.ntt.com/api-reference/javascript.html#options-object

### auth_url

- no-password : ""
- browser-only : "browser"

#### browser-only

認証サーバなしでは通常の認証は不可能なため、パスワードを暗号学的ハッシュ関数にかけた出力をルーム名に付加したものを「真のルーム名」として利用しています。このため、パスワードが合わない人が覗き見ることは事実上不可能です。
(Because normal authorizations are not supported without auth-server, "browser-only" mode concatenates room name with cryptographically-hashed password and use it as true room name. So it is virtually impossible for anyone who doesn't know password to peek subtitles)
