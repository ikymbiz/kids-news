const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function fetchNews() {
    // podcasts.jsonを読み込む
    const podcasts = JSON.parse(fs.readFileSync('./podcasts.json', 'utf8'));
    let allEpisodes = [];
    
    // 過去1年分（365日）のニュースを取得するように変更
    const cutoff = Date.now() - (20 * 24 * 60 * 60 * 1000); 

    for (const pod of podcasts) {
        try {
            console.log(`\n🔄 取得中: ${pod.name}`);
            
            // 1. iTunes APIからRSSのURLを取得
            const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${pod.id}&country=jp`);
            const itunesData = await itunesRes.json();
            if (!itunesData.results || itunesData.results.length === 0) {
                console.log(`⚠️ ${pod.name} の番組情報が見つかりません`);
                continue;
            }

            const feedUrl = itunesData.results[0].feedUrl;
            const artwork = itunesData.results[0].artworkUrl100;

            // 2. ブロックされないように「普通のブラウザ」のフリをしてデータを取得する
            const feedRes = await fetch(feedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            
            if (!feedRes.ok) {
                console.log(`⚠️ ${pod.name} のアクセスが拒否されました (${feedRes.status})`);
                continue;
            }

            // 取得したテキストデータを変換
            const xmlText = await feedRes.text();
            const feed = await parser.parseString(xmlText);

            console.log(`✅ ${pod.name} のニュースを ${feed.items.length} 件みつけました！`);

            // 3. アプリ用のデータに変換
            const episodes = feed.items.slice(0, 15).map(item => {
                // 日付が特殊な形式でもエラーにならないようにする
                const dateObj = new Date(item.pubDate || item.isoDate || Date.now());
                const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
                
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

            console.log(`📅 そのうち、新しいニュースは ${episodes.length} 件でした`);
            allEpisodes = allEpisodes.concat(episodes);
        } catch (error) {
            console.error(`❌ ${pod.name} の取得に失敗しました:`, error.message);
        }
    }

    // 日付の新しい順に並べ替え
    allEpisodes.sort((a, b) => b.timestamp - a.timestamp);

    // 取得したデータを「news.json」として保存する
    fs.writeFileSync('./news.json', JSON.stringify(allEpisodes, null, 2));
    console.log(`\n✨ news.json を新しく作成・更新しました！ (合計: ${allEpisodes.length} 件保存されました)`);
}

fetchNews();
