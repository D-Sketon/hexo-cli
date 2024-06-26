import chai from 'chai';
import { join } from 'path';
import { listDir, rmdir, createReadStream } from 'hexo-fs';
import { createSha1Hash } from 'hexo-util';
import rewire from 'rewire';
import Context from '../../lib/context';
chai.should();

const assetDir = join(__dirname, '../../assets');

describe('init', () => {
  const baseDir = join(__dirname, 'init_test');
  const initModule = rewire('../../dist/console/init');
  const hexo = new Context(baseDir, { silent: true });
  const init = initModule.bind(hexo);
  let assets: string[] = [];

  async function rmDir(path: string) {
    try {
      await rmdir(path);
    } catch (err) {
      if (err && err.code === 'ENOENT') return;
      throw err;
    }
  }

  function pipeStream(rs, ws) {
    return new Promise((resolve, reject) => {
      rs.pipe(ws)
        .on('error', reject)
        .on('finish', resolve);
    });
  }

  async function compareFile(a, b) {
    const streamA = createSha1Hash();
    const streamB = createSha1Hash();

    await Promise.all([
      pipeStream(createReadStream(a), streamA),
      pipeStream(createReadStream(b), streamB)
    ]);

    return streamA.read().equals(streamB.read());
  }

  async function check(path) {
    for (const item of assets) {
      const result = await compareFile(
        join(assetDir, item),
        join(path, item)
      );

      result.should.be.true;
    }

  }

  function withoutSpawn(fn) {
    return initModule.__with__({
      'spawn_1': () => Promise.reject(new Error('spawn is not available'))
    })(fn);
  }

  before(async () => {
    const files = await listDir(assetDir);
    assets = files;
  });

  after(async () => await rmDir(baseDir));

  it('current path', () => withoutSpawn(async () => {
    await init({_: []});
    await check(baseDir);
  }));

  it('relative path', () => withoutSpawn(async () => {
    await init({_: ['test']});
    await check(join(baseDir, 'test'));
  }));

  it('unconventional path - 0x', () => withoutSpawn(async () => {
    await init({_: ['0x400']});
    await check(join(baseDir, '0x400'));
  }));

  it('unconventional path - 0b', () => withoutSpawn(async () => {
    await init({_: ['0b101']});
    await check(join(baseDir, '0b101'));
  }));

  it('unconventional path - 0o', () => withoutSpawn(async () => {
    await init({_: ['0o71']});
    await check(join(baseDir, '0o71'));
  }));

  it('unconventional path - undefined', () => withoutSpawn(async () => {
    await init({_: ['undefined']});
    await check(join(baseDir, 'undefined'));
  }));

  it('unconventional path - null', () => withoutSpawn(async () => {
    await init({_: ['null']});
    await check(join(baseDir, 'null'));
  }));

  it('unconventional path - true', () => withoutSpawn(async () => {
    await init({_: ['true']});
    await check(join(baseDir, 'true'));
  }));

  it('path multi-charset', () => withoutSpawn(async () => {
    await init({_: ['中文']});
    await check(join(baseDir, '中文'));
  }));

  it('absolute path', () => {
    const path = join(baseDir, 'test');

    withoutSpawn(async () => {
      await init({_: [path]});
      await check(path);
    });
  });

  it('git clone');

  it('npm install');
});
