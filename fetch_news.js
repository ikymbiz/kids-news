const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function fetchNews() {
    // podcasts.jsonを読み込む
    const podcasts = JSON.parse(fs.readFileSync('./podcasts.json', 'utf8'));
    let allEpisodes = [];
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - TWO_WEEKS_MS;

    for (const pod of podcasts) {
        try {
            console.log(`🔄 取得中: ${pod.name}`);
            
            // 1. iTunes APIからRSSのURLを取得
            const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${pod.id}&country=jp`);
            const itunesData = await itunesRes.json();
            if (!itunesData.results || itunesData.results.length === 0) continue;

            const feedUrl = itunesData.results[0].feedUrl;
            const artwork = itunesData.results[0].artworkUrl100;

            // 2. RSSフィードを取得
            const feed = await parser.parseURL(feedUrl);

            // 3. アプリ用のデータに変換
            const episodes = feed.items.slice(0, 15).map(item => {
                const dateObj = new Date(item.pubDate);
                const timestamp = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
                
                // HTMLタグを取り除いてきれいなテキストにする
                let desc = item.contentSnippet || item.content || "（ニュースの文章がありません）";
                desc = desc.replace(/<[^>]*>?/gm, '').trim();

                return {
                    id: item.guid || item.title,
                    podcastName: pod.name,
                    title: item.title || "タイトルなし",
                    date: dateObj.toLocaleDateString('ja-JP'),
                    timestamp: timestamp,
                    audio: item.enclosure ? item.enclosure.url : "",
                    image: artwork,
                    desc: desc
                };
            }).filter(ep => ep.timestamp >= cutoff);

            allEpisodes = allEpisodes.concat(episodes);
        } catch (error) {
            console.error(`❌ ${pod.name}の取得に失敗しました:`, error.message);
        }
    }

    // 日付の新しい順に並べ替え
    allEpisodes.sort((a, b) => b.timestamp - a.timestamp);

    // 取得したデータを「news.json」として保存する
    fs.writeFileSync('./news.json', JSON.stringify(allEpisodes, null, 2));
    console.log('✨ news.json を新しく作成・更新しました！');
}

fetchNews();
