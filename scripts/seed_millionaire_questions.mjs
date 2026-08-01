import { neon } from '@neondatabase/serverless';

const prizeByQuestionNumber = {
  1: 10000,
  2: 20000,
  3: 30000,
  4: 50000,
  5: 100000,
  6: 150000,
  7: 250000,
  8: 500000,
  9: 750000,
  10: 1000000,
  11: 1500000,
  12: 2500000,
  13: 5000000,
  14: 7500000,
  15: 10000000,
};

const raw = String.raw`
1:10,000円
・別名「ピアノの詩人」と呼ばれるポーランド出身の作曲家は誰？
A.ルパン　B.ショパン　C.アッチャン　D.クリームパン
正解:B.ショパン

・衣服の展示などに用いる等身大の人形を何という？
A.ハナキン　B.マネキン　C.ヒカキン　D.シャッキン
正解:B.マネキン

・昔話「桃太郎」で、おばあさんが桃を拾った場所はどこ？
A.山　B.海　C.湖　D.川
正解:D.川

・ボクシングで戦う場所はどこ？
A.土俵　B.マウンド　C.リング　D.トラック
正解:C.リング

・演技の下手な役者を、俗に何役者という？
A.にんじん　B.大根　C.玉ねぎ　D.キャベツ
正解:B.大根

・JR渋谷駅前にある、待ち合わせの目印の忠犬の銅像の名前はどれ？
A.シロー　B.ハチ　C.ポチ　D.タロー
正解:B.ハチ

・「ツクツクボウシ」「ヒグラシ」といえば何の名前？
A.ホタル　B.セミ　C.カブトムシ　D.コオロギ
正解:B.セミ

・「ビーフ」といえば何の肉？
A.豚　B.羊　C.鶏　D.牛
正解:D.牛

・本州で一番北に位置する県はどれ？
A.秋田県　B.青森県　C.岩手県　D.宮城県
正解:B.青森県

2:20,000円
・「馬鈴薯」とも呼ばれる作物はどれ？
A.さといも　B.じゃがいも　C.だいこん　D.にんじん
正解:B.じゃがいも

・「ジョナゴールド」「つがる」「ふじ」…といえばどんな果物？
A.りんご　B.ぶどう　C.みかん　D.ドリアン
正解:A.りんご

・俗に「忙しいときに借りたい」と言われるのは何の手？
A.孫の手　B.奥の手　C.山の手　D.猫の手
正解:D.猫の手

・飽きやすく何をしても長続きしない事を何日坊主という？
A.一日　B.二日　C.三日　D.四日
正解:C.三日

・2月14日は何の日？
A.ホワイトデー　B.クリスマス　C.エイプリルフール　D.バレンタインデー
正解:D.バレンタインデー

・「アメリカ大統領官邸」の別名は何？
A.オレンジハウス　B.オペラハウス　C.ホワイトハウス　D.フルハウス
正解:C.ホワイトハウス

・警察に電話する時の番号はどれ？
A.119　B.110　C.177　D.104
正解:B.110

・アカデミー賞を受賞した映画「タイタニック」のタイタニックとは何の名前？
A.飛行機　B.自動車　C.気球　D.船
正解:D.船

・明らかに無関係な人を例えて、「何の他人」という？
A.白　B.赤　C.青　D.緑
正解:B.赤

・駐車場をあらわすアルファベット一文字はどれ？
A.「O」　B.「P」　C.「Q」　D.「R」
正解:B.「P」

・昔話「花咲かじいさん」で、正直じいさんがまいたものはどれ？
A.灰　B.砂　C.花びら　D.塩
正解:A.灰

3:30,000円
・5月5日の端午の節句にお風呂に入れる習わしのあるものはどれ？
A.柚子　B.菖蒲　C.牛乳　D.笹
正解:B.菖蒲

・ルイス・キャロルの小説で、不思議の国へ行った主人公は誰？
A.モモ　B.アリス　C.ドロシー　D.ウェンディ
正解:B.アリス

・電話を発明したのは誰？
A.ベル　B.リンリン　C.コール　D.メロディー
正解:A.ベル

・ピンクレディーのデビュー曲は「何警部」？
A.オイスター　B.ウスター　C.マヨネーズ　D.ペッパー
正解:D.ペッパー

・ボウリングで、第1投目ですべてのピンを倒すことを何という？
A.ストレート　B.ストレッチ　C.ストライク　D.ストロング
正解:C.ストライク

・パリは花の都、では、ウィーンは何の都？
A.映画　B.水　C.音楽　D.惇
正解:C.音楽

・ガーリックといえばにんにく、では、ジンジャーといえば何？
A.玉ねぎ　B.じゃがいも　C.しょうが　D.もやし
正解:C.しょうが

・たくあん漬けに使われる野菜はどれ？
A.カブ　B.ニンジン　C.白菜　D.大根
正解:D.大根

・ディズニーのキャラクターでおなじみのダンボはどんな動物？
A.犬　B.猫　C.象　D.リス
正解:C.象

・中華人民共和国の首都はどこ？
A.上海　B.香港　C.北京　D.南京
正解:C.北京

4:50,000円
・顔が似ていたためについた豊臣秀吉の「あだ名」はどれ？
A.猫　B.犬　C.猿　D.狐
正解:C.猿

・陸上競技のリレー種目で、最後に走る選手はどれ？
A.キーパー　B.スプリンター　C.アンカー　D.クォーターバック
正解:C.アンカー

・道産子の出身地といえばどこ？
A.北海道　B.東京　C.大阪　D.熊本
正解:A.北海道

・北極や南極に近い空に現れる、放電による発光現象はどれ？
A.虹　B.オーロラ　C.夕焼け　D.彗星
正解:B.オーロラ

・「弁慶の泣き所」といえば体のどこ？
A.ひざ　B.すね　C.太もも　D.足首
正解:B.すね

・ミッキーマウスはネズミ、ではドナルドはどれ？
A.アヒル　B.ペンギン　C.ハクチョウ　D.ダチョウ
正解:A.アヒル

・茶碗蒸しなどに入れる「ぎんなん」は何の種子？
A.さくら　B.梅　C.イチョウ　D.松
正解:C.イチョウ

・宝塚歌劇団のモットーとは「清く、正しく、何」？
A.優しく　B.愛らしく　C.貧しく　D.美しく
正解:D.美しく

5:100,000円
・月面などに多く見られる、隕石がぶつかった跡の「くぼみ」はどれ？
A.クレバス　B.カルデラ　C.クレーター　D.フィヨルド
正解:C.クレーター

・フランス語で「三日月」という意味のパンはどれ？
A.バケット　B.クロワッサン　C.ワッフル　D.トルティーヤ
正解:B.クロワッサン

・スペイン南部アンダルシア地方で生まれた情熱的な民族舞踊はどれ？
A.フラメンコ　B.ヒップホップ　C. パラパラ　D.ブレイクダンス
正解:A.フラメンコ

・1853年、黒船で浦賀に来航したのは誰？
A.マッカーサー　B.ペリー　C.ザビエル　D.コロンブス
正解:ペリー

・戦国武将、毛利元就の故事で有名なのは「三本の何」？
A.杖　B.木刀　C.矢　D.笛
正解:C.矢

・野球で、ピッチャーとキャッチャーのコンビをあらわす言葉はどれ？
A.エンジン　B.バッテリー　C.モーター　D.エネルギー
正解:B.バッテリー

・現在発行されている1円玉の材料はどれ？
A.銀　B.鉄　C.アルミニウム　D.銅
正解:C.アルミニウム

6:150,000円
・「東方見聞録」で、日本を黄金の国”ジパング”として紹介したのは誰？
A.マゼラン　B.ボッカチオ　C.マルコ・ポーロ　D.コロンブス
正解:C.マルコ・ポーロ

・四大河文明のうち、チグリス川とユーフラテス川の間に栄えた文明はどれ？
A.エジプト文明　B.インダス文明　C.メソポタミア文明　D.黄河文明
正解:C.メソポタミア文明

・アルファベットの「Ｗ」に似た形をしているおなじみの星座の名前はどれ？
A.オリオン座　B.カシオペヤ座　C.ペガスス座　D.アンドロメダ座
正解:B.カシオペヤ座

・木の年輪の形をしたドイツのお菓子はどれ？
A.エクレア　B.ブッシュドノエル　C.バウムクーヘン　D.ナタデココ
正解:C.バウムクーヘン

・「ラム」や「マトン」の名前で知られている肉は何の動物？
A.鹿　B.猪　C.馬　D.羊
正解:D.羊

・都心部の人口が少なくなり、周辺部の人口が過密になる現象はどれ？
A.タイヤ化現象　B.ドーナツ化現象　C.リング化現象　D.フラフープ化現象
正解:B.ドーナツ化現象

・次のうち、日本で生まれた言葉はどれ？
A.たばこ　B.ところてん　C.てんぷら　D.こんぺいとう
正解:B.ところてん

・地図記号で、卍(まんじ)の記号で表されるものはどれ？
A.交番　B.学校　C.寺院　D.病院
正解:C.寺院

7:250,000円
・ハワイ諸島の中で、最も大きな島はどこ？
A.オアフ島　B.マウイ島　C.ハワイ島　D.カウアイ島
正解:C.ハワイ島

・アクセサリーの「ピンキー・リング」をする指はどれ？
A.人差し指　B.中指　C.薬指　D.小指
正解:D.小指

・時計の短針が1時間に動く角度は何度？
A.12度　B.15度　C.30度　D.36度
正解:C.30度

・「人民の人民による人民のための政治」と説いた人物は誰？
A.ナポレオン　B.リンカーン　C.ビスマルク　D.スターリン
正解:B.リンカーン

・ギリシャ神話に登場する海の神の名前はどれ？
A.ゼウス　B.アポロン　C.ポセイドン　D.ハデス
正解:C.ポセイドン

・天下分け目の合戦が行われた関ヶ原があるのは現在の何県？
A.長野県　B.岐阜県　C.三重県　D.滋賀県
正解:B.岐阜県

・英語で「サニーサイドアップ」と呼ばれる卵料理はどれ？
A.ゆで卵　B.目玉焼き　C.茶碗蒸し　D.だし巻き卵
正解:B.目玉焼き

・本州で最も西にある県はどこ？
A.沖縄県　B.広島県　C.山口県　D.島根県
正解:C.山口県

・「春はあけぼの」で始まる、清少納言の随筆はどれ？
A.源氏物語　B.枕草子　C.徒然草　D.土佐日記
正解:B.枕草子

8:500,000円
・次のうち、明治の文豪、森鴎外の作品はどれ？
A.三四郎　B.高瀬舟　C.地獄変　D.暗夜行路
正解:B.高瀬舟

・ダ・ヴィンチの名画「モナリザ」が収蔵されている美術館はどこ？
A.プラド美術館　B.エルミタージュ美術館　C.ルーヴル美術館　D.メトロポリタン美術館
正解:C.ルーヴル美術館

・スヌーピー、チャーリー・ブラウンが登場する漫画のタイトルはどれ？
A.ピーナッツ　B.ビスケット　C.ポップコーン　D.ポテトチップス
正解:A.ピーナッツ

・「国連教育科学文化機関」の略称はどれ？
A.UNESCO(ユネスコ)　B.UNICEF(ユニセフ)　C. APEC(エイペック)　D. UNCTAD(アンクタッド)
正解:A. UNESCO(ユネスコ)

・徳川将軍家の家紋でおなじみの植物といえばどれ？
A.梅　B.葵　C.藤　D.菊
正解:B.葵

・彫刻「考える人」の作者は誰？
A.ピカソ　B.ロダン　C.ミケランジェロ　D.ダ・ヴィンチ
正解:B.ロダン

・体内に侵入してきた細菌を殺す、血液中の成分はどれ？
A.血小板　B.白血球　C.赤血球　D.ヘモグロビン
正解:B.白血球

9:750,000円
・白鷺城という別名を持ち、世界遺産にも登録されている、日本のお城はどれ？
A.姫路城　B.松本城　C.熊本城　D.彦根城
正解:A.姫路城

・天気記号で、「◎」が表す天気はどれ？
A.快晴　B.晴れ　C.曇り　D.雨
正解:C.曇り

・1963年、日本の曲として初めて全米トップヒットを記録した坂本九の曲「上を向いて歩こう」の英題はどれ？
A.テンプラ　B.スキヤキ　C.シャブシャブ　D.ユドウフ
正解:B.スキヤキ

・英語で「キャットフィッシュ」といえばどれ？
A.金魚　B.マグロ　C.ナマズ　D.うなぎ
正解:C.ナマズ

・明けの明星、宵の明星と呼ばれる星はどれ？
A.水星　B.金星　C.火星　D.木星
正解:B.金星

・国際連合の本部がある都市はどこ？
A.ワシントンD.C.　B.ジュネーブ　C.ロンドン　D.ニューヨーク
正解:D.ニューヨーク

・ボリード、バーキン、ケリーなどのバッグが人気のブランドはどれ？
A.プラダ　B.ルイ・ヴィトン　C.グッチ　D.エルメス
正解:D.エルメス

10:1,000,000円
・謎の石造「モアイ」で知られるイースター島がある国はどこ？
A.チリ　B.ペルー　C.ボリビア　D.エクアドル
正解:A.チリ

・次のうち、現在国王がいる国はどこ？
A.スイス　B.フランス　C.イタリア　D.スペイン
正解:D.スペイン

・コモロ諸島近海に生息する「生きた化石」はどれ？
A.アンモナイト　B.シーラカンス　C.サンヨウチュウ　D.ケンミジンコ
正解:B.シーラカンス

・ガムなどに使われ、虫歯形成を抑える働きがある甘味料はどれ？
A.ポリフェノール　B.カテキン　C.キシリトール　D.タンニン
正解:C.キシリトール

・物価が急上昇し、貨幣価値が下落する現象はどれ？
A.デフレーション　B.インフレーション　C.デノミネーション　D.プランテーション
正解:B.インフレーション

・レストランの等級を格付けする「ミシュラン」を発行するのは、もともと何の会社？
A.タイヤ　B.家具　C.靴　D.スーパーマーケット
正解:A.タイヤ

・豊富な漁獲資源を運んでくることから名付けられた千島海流の別名はどれ？
A.親潮　B.大潮　C.黒潮　D.渦潮
正解:A.親潮

・浮力の原理を発見したのは誰？
A.ソクラテス　B.パスカル　C.アルキメデス　D.ニュートン
正解:C.アルキメデス

・著書「法の精神」の中で三権分立を主張したフランスの政治思想家は誰？
A.ルソー　B.ホッブス　C.ベンサム　D.モンテスキュー
正解:D.モンテスキュー

11:15,000,000円
・音楽用語で「だんだん遅く」という意味の言葉はどれ？
A.ピアニッシモ　B.デクレッシェンド　C.リタルダント　D.フェルマータ
正解:C.リタルダント

・第一次世界大戦の引き金となったオーストリア皇太子夫妻暗殺事件はどれ？
A.ゾルゲ事件　B.サラエボ事件　C.ドレフュス事件　D.ノモンハン事件
正解:B.サラエボ事件

・珍味のひとつ「カラスミ」は、どの魚の卵巣？
A.ハゼ　B.サケ　C.アユ　D.ボラ
正解:D.ボラ

・幼少の頃「竹千代」と呼ばれた戦国武将は誰？
A.徳川家康　B.豊臣秀吉　C.織田信長　D.武田信玄
正解:A.徳川家康

・ナポレオンがエジプト遠征で発見した「ロゼッタストーン」が収蔵されている施設はどこ？
A.オルセー美術館　B.メトロポリタン美術館　C.大英博物館　D.カイロ博物館
正解:C.大英博物館

・「旅に病んで夢は枯野を駆け巡る」、この句を詠んだ俳人は誰？
A.正岡子規　B.小林一茶　C.松尾芭蕉　D.与謝蕪村
正解:C.松尾芭蕉

・ 「デビュー」という言葉は何語？
A.フランス語　B.ドイツ語　C.スペイン語　D.イタリア語
正解:A.フランス語

・イタリア料理のフルコースで、デザートをさす言葉はどれ？
A.フォルマッジョ　B.アンティパスト　C.デセール　D.ドルチェ
正解:D.ドルチェ

12:25,000,000円
・オリンピックの五輪のマークで真ん中にある輪の色は何色？
A.黒　B.青　C.赤　D.緑
正解:A.黒

・次のうち、赤道が通っていない国はどれ？
A.インドネシア　B.コンゴ　C.エクアドル　D.アルゼンチン
正解:D.アルゼンチン

・落語「まんじゅうこわい」の中で、主人公が最後に怖がってみせるものはどれ？
A.お茶　B.お酒　C.お酢　D.お湯
正解:A.お茶

・ネッシーで有名になった「ネス湖」があるのはイギリスのどこ？
A.イングランド　B.スコットランド　C.ウェールズ　D.北アイルランド
正解:B.スコットランド

・1851年、初めて万国博覧会が開催された都市はどこ？
A.パリ　B.ロンドン　C.バルセロナ　D.ワシントンD.C.
正解:B.ロンドン

13:50,000,000円
・イルカの体にある発声に関わる器官はどれ？
A.パイン　B.メロン　C.レモン　D.バナナ
正解:B.メロン

・数のケタを表す言葉で、億の次は兆、兆の次は京、では京の次はどれ？
A.正(せい)　B. 垓(がい)　C.載(さい)　D.極(ごく)
正解: B.垓(がい)

・元気な女の子という意味の「おてんば」とはもともとは何語？
A.フランス語　B.ポルトガル語　C.イタリア語　D.オランダ語
正解:D.オランダ語

14:75,000,000円
・チェスで、将棋の「角」と同じような働きをする駒はどれ？
A.ナイト　B.ルーク　C.ポーン　D.ビショップ
正解:D.ビショップ

・次のうち、ノーベル平和賞を受賞していないのは誰？
A.マハトマ・ガンジー　B.キング牧師　C.オバマ元大統領　D.マザー・テレサ
正解:A.マハトマ・ガンジー

15.100,000,000円
・天皇陛下が公務で乗る自動車のナンバープレートに書かれている漢字一文字はどれ？
A.皇　B.宮　C.王　D.帝
正解:A.皇

・カルロ・コロディ作の童話「ピノキオ」で、ピノキオが最初に喋った言葉はどれ？
A.おはよう　B.まぶしいよ　C.叩かないで　D.うるさいなあ
正解:C.叩かないで

・マルコ・ポーロの「東方見聞録」で、「ジパング」の住人についての記述は次のうちどれ？
A.服を着ていない　B.木の上に住んでいる　C.人を食べる　D.尻尾が生えている
正解:C.人を食べる

・現在の中国の国歌は、もともとどれ？
A.外国民謡　B.映画主題歌　C.童謡　D.校歌
正解:B.映画主題歌

・アメリカ元大統領のバラク・オバマが、就任演説で一度も使わなかった単語は次のうちどれ？
A.Dream(夢)　B.Peace(平和)　C.Freedom(自由)　D.Hero(英雄)
正解: A.Dream(夢)

・平安時代に書かれた「竹取物語」で、かぐや姫は何に乗って月に帰った？
A.空飛ぶ船　B.空飛ぶ車　C.空飛ぶ駕籠(かご)　D.空飛ぶ雲
正解:B.空飛ぶ車

・小説「ガリバー旅行記」で、主人公が最初に訪れた国の小さな住民の身長はおよそ何cm？
A.1cm　B.5cm　C.15cm　D.30cm
正解:C.15cm
`;

function parseQuestions(source) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = [];
  let currentQuestionNumber = null;
  let currentPrizeAmount = null;
  let currentQuestion = null;
  let currentChoices = null;

  const finalize = (answerKey, answerText) => {
    if (!currentQuestionNumber || !currentPrizeAmount || !currentQuestion || !currentChoices) {
      return;
    }
    const resolvedAnswerKey = answerKey || currentChoices.find((choice) => choice === answerText) ? ['A', 'B', 'C', 'D'][currentChoices.findIndex((choice) => choice === answerText)] : null;
    const answerKeyFromText = resolvedAnswerKey || null;
    const answerIndex = ({ A: 1, B: 2, C: 3, D: 4 })[answerKeyFromText || ''] ?? 0;
    if (!answerIndex) {
      throw new Error(`Failed to resolve answer key for: ${currentQuestion}`);
    }
    items.push({
      questionNumber: currentQuestionNumber,
      prizeAmount: currentPrizeAmount,
      question: currentQuestion,
      choices: currentChoices,
      answerKey: answerKeyFromText,
      answerIndex,
    });
  };

  for (const line of lines) {
    const header = line.match(/^(\d+)[\.:：．]([\d,]+)円$/);
    if (header) {
      currentQuestionNumber = Number(header[1]);
      currentPrizeAmount = prizeByQuestionNumber[currentQuestionNumber];
      continue;
    }

    if (line.startsWith('・')) {
      currentQuestion = line.slice(1).trim();
      continue;
    }

    const choiceMatch = line.match(/^A[.．]\s*(.*?)\s+B[.．]\s*(.*?)\s+C[.．]\s*(.*?)\s+D[.．]\s*(.*)$/);
    if (choiceMatch) {
      currentChoices = [choiceMatch[1].trim(), choiceMatch[2].trim(), choiceMatch[3].trim(), choiceMatch[4].trim()];
      continue;
    }

    const answerMatch = line.match(/^正解[:：]?\s*([ABCD])(?:[.．]\s*(.*))?$/);
    if (answerMatch) {
      const answerKey = answerMatch[1];
      const answerText = (answerMatch[2] || '').trim();
      if (!currentChoices) {
        throw new Error(`Choices missing before answer: ${currentQuestion || ''}`);
      }
      const answerIndex = ({ A: 1, B: 2, C: 3, D: 4 })[answerKey] ?? 0;
      const answerTextResolved = answerText || currentChoices[answerIndex - 1] || '';
      items.push({
        questionNumber: currentQuestionNumber,
        prizeAmount: currentPrizeAmount,
        question: currentQuestion,
        choices: currentChoices,
        answerKey,
        answerIndex,
      });
      currentQuestion = null;
      currentChoices = null;
      continue;
    }

    const answerTextOnlyMatch = line.match(/^正解[:：]\s*(.+)$/);
    if (answerTextOnlyMatch) {
      const answerText = answerTextOnlyMatch[1].trim();
      if (!currentChoices) {
        throw new Error(`Choices missing before text-only answer: ${currentQuestion || ''}`);
      }
      const answerIndex = currentChoices.findIndex((choice) => choice === answerText);
      if (answerIndex === -1) {
        throw new Error(`Failed to infer answer for: ${currentQuestion}`);
      }
      const answerKey = ['A', 'B', 'C', 'D'][answerIndex];
      items.push({
        questionNumber: currentQuestionNumber,
        prizeAmount: currentPrizeAmount,
        question: currentQuestion,
        choices: currentChoices,
        answerKey,
        answerIndex: answerIndex + 1,
      });
      currentQuestion = null;
      currentChoices = null;
      continue;
    }
  }

  return items;
}

const questions = parseQuestions(raw);

const databaseUrl = process.env.DATABASE_URL || process.env.mayuko_DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    choice_1 TEXT NOT NULL,
    choice_2 TEXT NOT NULL,
    choice_3 TEXT NOT NULL,
    choice_4 TEXT NOT NULL,
    answer_index INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    answer_key TEXT,
    question_number INTEGER,
    prize_amount BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS answer_key TEXT`;
await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_number INTEGER`;
await sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS prize_amount BIGINT`;

let inserted = 0;
let skipped = 0;
const existingRows = await sql`
  SELECT question FROM quiz_questions
`;
const existingSet = new Set(existingRows.map((row) => row.question));
const pending = questions.filter((item) => {
  if (existingSet.has(item.question)) {
    skipped += 1;
    return false;
  }
  return true;
});

if (pending.length > 0) {
  await sql.transaction(
    pending.map((item) => sql`
      INSERT INTO quiz_questions (
        question,
        choice_1,
        choice_2,
        choice_3,
        choice_4,
        answer_index,
        difficulty,
        answer_key,
        question_number,
        prize_amount
      ) VALUES (
        ${item.question},
        ${item.choices[0]},
        ${item.choices[1]},
        ${item.choices[2]},
        ${item.choices[3]},
        ${item.answerIndex},
        ${item.questionNumber},
        ${item.answerKey},
        ${item.questionNumber},
        ${item.prizeAmount}
      )
    `)
  );

  inserted = pending.length;
}

console.log(JSON.stringify({ totalParsed: questions.length, inserted, skipped }, null, 2));
