# z0y
零時字引。漢字部件查詢

線上使用 <http://rawgit.com/g0v/z0y/master/>

create node_modules/idsdata/decompose.js

    cd node_modules/idsdata
    node gen

rebuild external data-bundle.js whenever node_modules/idsdata is changed.

    build-data

rebuild external react-bundle.js whenever react.js is changed.

    build-react

rebuild bundle.js if any other js is changed.

    build

serve index.html with webserver, node-webkit , or open directly with browser (file://)