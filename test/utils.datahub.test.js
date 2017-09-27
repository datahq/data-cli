const path = require('path')
const test = require('ava')
const nock = require('nock')
const urljoin = require('url-join')
const {Dataset, File} = require('data.js')

const {DataHub, processExcelSheets} = require('../lib/utils/datahub.js')

test('Can instantiate DataHub', t => {
  const apiUrl = 'https://apifix.datahub.io'
  const token = ''
  const datahub = new DataHub({apiUrl, token})
  t.is(datahub.apiUrl, apiUrl)
})

// =====================
// Push stuff

const config = {
  token: 't35tt0k3N',
  api: 'https://test.com',
  profile: {
    id: 'test-userid',
    username: 'test-username'
  }
}

const datahub = new DataHub({apiUrl: config.api, token: config.token, ownerid: config.profile.id, owner: config.profile.username})

const dpinfo = {
  md5: 'm84YSonibUrw5Mg8QbCNHA==',
  length: 72,
  name: 'datapackage.json'
}

const finVixInfo = {
  'vix-daily': {
    length: 719,
    md5: 'zqYInZMy1fFndkTED3QUPQ==',
    name: 'vix-daily'
  },
  'datapackage.json': {
    length: 2830,
    md5: 's6Ex9JHrfrGSkEF7Gin8jg==',
    name: 'datapackage.json'
  }
}

const rawstoreUrl = 'https://s3-us-west-2.amazonaws.com'

const authorizeForServices = nock(config.api, {reqheaders: {'Auth-Token': 't35tt0k3N'}})
  .persist()
  .get('/auth/authorize?service=rawstore')
  .reply(200, {
    permissions: {},
    service: 'test',
    token: 'authz.token',
    userid: 'testid'
  })
  .get('/auth/authorize?service=source')
  .reply(200, {
    permissions: {},
    service: 'test',
    token: 'authz.token',
    userid: 'testid'
  })

const rawstoreAuthorize = nock(config.api, {reqheaders: {'Auth-Token': 'authz.token'}})
  .persist()
  .post('/rawstore/authorize', {
    metadata: {
      owner: config.profile.id
    },
    filedata: {'datapackage.json': dpinfo}
  })
  .reply(200, {
    filedata: {
      'datapackage.json': {
        md5: dpinfo.md5,
        length: 85,
        name: 'datapackage.json',
        type: 'application/json',
        // eslint-disable-next-line camelcase
        upload_query: {
          key: dpinfo.md5,
          policy: '...',
          'x-amz-algorithm': 'AWS4-HMAC-SHA256',
          'x-amz-credential': 'XXX',
          'x-amz-signature': 'YYY'
        },
        // eslint-disable-next-line camelcase
        upload_url: rawstoreUrl
      }
    }
  })

const rawstoreAuthorize2 = nock(config.api, {reqheaders: {'Auth-Token': 'authz.token'}})
  .persist()
  .post('/rawstore/authorize', {
    metadata: {
      owner: config.profile.id
    },
    filedata: finVixInfo
  })
  .reply(200, {
    filedata: {
      'vix-daily': {
        md5: finVixInfo['vix-daily'].md5,
        length: finVixInfo['vix-daily'].length,
        name: finVixInfo['vix-daily'].name,
        // eslint-disable-next-line camelcase
        upload_query: {
          key: finVixInfo['vix-daily'].md5,
          policy: '...',
          'x-amz-algorithm': 'AWS4-HMAC-SHA256',
          'x-amz-credential': 'XXX',
          'x-amz-signature': 'YYY'
        },
        // eslint-disable-next-line camelcase
        upload_url: rawstoreUrl
      },
      'datapackage.json': {
        md5: finVixInfo['datapackage.json'].md5,
        length: finVixInfo['datapackage.json'].length,
        name: 'datapackage.json',
        // eslint-disable-next-line camelcase
        upload_query: {
          key: finVixInfo['datapackage.json'].md5,
          policy: '...',
          'x-amz-algorithm': 'AWS4-HMAC-SHA256',
          'x-amz-credential': 'XXX',
          'x-amz-signature': 'YYY'
        },
        // eslint-disable-next-line camelcase
        upload_url: rawstoreUrl
      }
    }
  })

const rawstoreStorageMock = nock(rawstoreUrl, {
}).persist().post(
    // TODO: get uploadBody working
    '/', // UploadBody
    ).reply(204)

const apiSpecStore = nock(config.api, {
  reqheaders: {
    'Auth-Token': 'authz.token'
  }
}).persist().post('/source/upload', {
  meta: {
    version: 1,
    ownerid: config.profile.id,
    owner: config.profile.username,
    dataset: 'dp-no-resources',
    findability: 'unlisted'
  },
  inputs: [
    {
      kind: 'datapackage',
      url: urljoin(rawstoreUrl, dpinfo.md5),
      parameters: {
        'resource-mapping': {}
      }
    }
  ]
})
  .reply(200, {
    success: true,
    id: 'test',
    errors: []
  })

const apiSpecStore2 = nock(config.api, {
  reqheaders: {
    'Auth-Token': 'authz.token'
  }
})
  .persist()
  .post('/source/upload', {
    meta: {
      version: 1,
      ownerid: config.profile.id,
      owner: config.profile.username,
      dataset: 'finance-vix',
      findability: 'unlisted'
    },
    inputs: [
      {
        kind: 'datapackage',
        url: urljoin(rawstoreUrl, finVixInfo['datapackage.json'].md5),
        parameters: {
          'resource-mapping': {
            'vix-daily': urljoin(rawstoreUrl, finVixInfo['vix-daily'].md5)
          }
        }
      }
    ]
  })
  .reply(200, {
    success: true,
    id: 'test',
    errors: []
  })

const apiSpecStore3 = nock(config.api, {
  reqheaders: {
    'Auth-Token': 'authz.token'
  }
})
  .persist()
  .post('/source/upload', {
    meta: {
      version: 1,
      ownerid: 'testid',
      owner: 'test',
      dataset: 'finance-vix',
      findability: 'published'
    },
    inputs: [
      {
        kind: 'datapackage',
        url: 'http:/testing.com/.datahub/datapackage.json',
        parameters: {
          'resource-mapping': {
            'vix-daily': 'http:/testing.com/vixcurrent.csv'
          }
        }
      }
    ],
    processing: [
      {
        input: 'vix-daily',
        tabulator: {
          skip_rows: 2,
          headers: [
            'Date',
            'VIXOpen',
            'VIXHigh',
            'VIXLow',
            'VIXClose'
          ],
        },
        output: 'vix-daily'
      }
    ],
    schedule: {
      crontab: '0 0 * * *'
    }
  })
  .reply(200, {
    success: true,
    id: 'test',
    errors: []
  })

test('push works with packaged dataset', async t => {
  const dataset = await Dataset.load('test/fixtures/dp-no-resources')
  const options = {findability: 'unlisted'}
  await datahub.push(dataset, options)

  t.is(rawstoreAuthorize.isDone(), true)
  t.is(rawstoreStorageMock.isDone(), true)
  t.is(apiSpecStore.isDone(), true)
  t.is(authorizeForServices.isDone(), true)

  // TODO: make sure we have not altered the dataset.resources object in any way
  t.is(dataset.resources.length, 0)
})

test('push-flow works', async t => {
  await datahub.pushFlow('test/fixtures/finance-vix/.datahub/flow.yaml')
  t.is(apiSpecStore3.isDone(), true)
})

test('push works with virtual package', async t => {
  const descriptor = {
    name: 'dp-no-resources',
    title: 'DP with No Resources',
    resources: []
  }
  const dataset = await Dataset.load(descriptor)
  const options = {findability: 'unlisted'}
  await datahub.push(dataset, options)

  t.is(rawstoreAuthorize.isDone(), true)
  t.is(rawstoreStorageMock.isDone(), true)
  t.is(apiSpecStore.isDone(), true)
  t.is(authorizeForServices.isDone(), true)

  // TODO: make sure we have not altered the dataset.resources object in any way
  t.is(dataset.resources.length, 0)
})

test('push works with package with resource', async t => {
  const dataset = await Dataset.load('test/fixtures/finance-vix')
  const options = {findability: 'unlisted'}
  await datahub.push(dataset, options)

  t.is(rawstoreAuthorize2.isDone(), true)
  t.is(rawstoreStorageMock.isDone(), true)
  t.is(apiSpecStore2.isDone(), true)
  t.is(authorizeForServices.isDone(), true)
})

// processExcelSheets function
test('processExcelSheets function works', async t => {
  const filePath = 'test/fixtures/sample-2sheets.xlsx'
  const pathParts = path.parse(filePath)
  const file = File.load(pathParts.base, {basePath: pathParts.dir})
  const metadata = {
    name: 'test',
    resources: []
  }
  const dataset = await Dataset.load(metadata)
  dataset.addResource(file)
  const processing = await processExcelSheets(dataset.resources)
  t.is(processing[0].input, 'sample-2sheets')
  t.is(processing[0].output, 'sample-2sheets-sheet-2')
  t.is(processing[0].schema.fields[0].name, 'header4')
})
