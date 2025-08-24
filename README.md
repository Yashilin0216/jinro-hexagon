# jnro-hexagon
## 起動方法
` docker-compose build `

` docker-compose run --rm app npm install `

` docker-compose up -d `

## 使い方
`localhost:3000`にアクセスしてユーザーidとルームidを入力。
### ファイル
- app/server.js
    - socket.io用のexpressサーバー
- app/hexagon-map/js/hexagon-map.js
    - マップメイン処理
- app/hexagon-map/js/move_restrictions.js
    - プレイヤーの動きを制限
- app/index.html
    - ルーム
- app/hexagon-map/hexagon-map.html
    - ゲームに盤面

## 開発環境
- front
    - vue.js
- server
    - node.js
    - express
- socket
    - socket.io


