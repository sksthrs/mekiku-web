# mekiku-web
Webブラウザ上で要約筆記（Subtitling on the web）

## お試し (give a try)

https://sksthrs.github.io/mekiku-web/dist/

## 既知の問題点 (known bugs)

- iPhoneのブラウザ上では、動作に異常があります。将来的には修正する予定です。 (On iPhone, not works properly. This will be fixed.)

## 設定について (Configuration)

`dist/config.json`

```json
{
  "api_key" : "your SkyWay API KEY",
  "debug_level" : 2, // NONE:0, ERROR:1, WARN:2, FULL:3
  "auth_url" : "browser" // no-password:"" , browser-only:"browser"
}
```

## 注意点 (Notice)

IEおよび古いMicrosoft Edgeでは動作しません。将来的にも対応はしません。なお、新しいEdge（Chromium版、アイコンが緑〜青のグラデーションのもの）では動作します。

(IE and older version of Microsoft Edge are not supported. Newer version of Microsoft Edge (Chromium-based, with green-blue icon) is supported.)

現在、試験公開中です。禁則処理や前ロールの文字コード対応（UTF-8以外への）を除いては動作するつもりですが、思わぬ不具合があるかもしれませんので、ご了承ください。

(Beta version. Currently, line-break rules and Pre-formatted-text-files of non-UTF8 are not supported.)
