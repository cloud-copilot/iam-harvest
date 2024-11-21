import { load } from 'cheerio'
import { mkdir, readFile } from 'fs/promises'
import { awsIamDocsRoot, htmlDownloadLocation } from './util/consts.js'
import { downloadUrlToFile, makeFullUrl } from './util/downloads.js'

/**
 * This script downloads the html files from the AWS IAM docs.
 */
interface Topic {
  name: string
  path: string
}

async function run() {
  await mkdir(htmlDownloadLocation, {recursive: true})
  const indexFile = htmlDownloadLocation + '/index.html'
  await downloadUrlToFile(awsIamDocsRoot + 'reference_policies_actions-resources-contextkeys.html', indexFile)

  const indexFileContents = await readFile(indexFile, 'utf-8')
  const doc = load(indexFileContents)
  const topicsList = doc('div.highlights ul')

  const topics: Topic[] = topicsList.find('li a').toArray().map((el) => {
    const topicLink = doc(el)
    const name = topicLink.text()
    const path = topicLink.attr('href')
    if (!path) {
      throw new Error('No path found for topic: ' + name)
    }
    return {name, path}
  })

  // We purposely do this syncrhonously so we don't get rate limited. Amazon can be... "touchy"
  for(const topic of topics) {
    const fullUrl = makeFullUrl(awsIamDocsRoot, topic.path);
    await downloadUrlToFile(fullUrl, htmlDownloadLocation + '/' + topic.name + '.html')
  }
}

run().catch((e) => {
    console.log(e)
    process.exit(1)
}).then(() => console.log('done'))