const puppeteer = require("puppeteer");
const urlencode = require("urlencode");

const runSpotiTube = async (search) => {
	const SP_BASE_URL = "https://open.spotify.com";
	const SP_SEARCH_URL = SP_BASE_URL + "/search/" + urlencode(search);
	const YT_BASE_URL = "https://www.youtube.com";

	return new Promise(async (resolve, reject) => {

		try {
			// launch new browser with headless = false to see the browser and maximize the window
			const browser = await puppeteer.launch({
				headless: false,
				args: ["--start-maximized"],
			});

			// open new page
			const page = await browser.newPage();
			// assing the windows size
			await page.setViewport({ width: 1280, height: 800 });
			// go to spotify URI to search the playlist
			await page.goto(SP_SEARCH_URL, { waitUntil: "networkidle2" });
			// go to the playlists section
			const [linkPlaylist] = await page.$x("//a[contains(text(), 'Playlist')]");
			await linkPlaylist.click();
			await page.waitForNavigation();

			// get all playlists found
			const listPlaylists = await page.evaluate(() => {
				let list = [];

				let playlists = Array.from(
					document.querySelectorAll("._3802c04052af0bb5d03956299250789e-scss")
				);
				playlists.map((playlist) => {
					let linkPlayList = playlist.querySelector("a");
					list.push({
						title: linkPlayList.getAttribute("title"),
						link: linkPlayList.getAttribute("href"),
					});
				});

				return list;
			});

			// go to first playlist
			await page.goto(SP_BASE_URL + listPlaylists[0].link, { waitUntil: "networkidle2" });

			// get the tracks from the playlist
			const listTracks = await page.evaluate(() => {
				let list = [];

				let tracks = Array.from(
					document.querySelectorAll('div[data-testid="tracklist-row"]')
				);
				tracks.map((track) => {
					let divTrack = track.querySelectorAll("div")[2];
					let trackData = divTrack.querySelector(
						"div > div .da0bc4060bb1bdb4abb8e402916af32e-scss"
					);
					let artistData = divTrack.querySelector("div > div > span > a");

					let artist = artistData.innerHTML.replace(/[^a-zA-Z ]/g, "").trim();
					let song = trackData.innerHTML.replace(/[^a-zA-Z ]/g, "").replace("New Stereo Mix", "").trim();

					list.push({
						song,
						artist
					});
				});

				return list;
			});

			if (listTracks) {

				// go to youtube 
				await page.goto(YT_BASE_URL, { waitUntil: "networkidle2" });

				// search and add track to playlist 
				for (const listTrack of listTracks) {

					// text to search 
					let track = `${listTrack.artist} live ${listTrack.song}`;

					// wait for the input and clean it 
					await page.waitForSelector("input[name=search_query]");
					await page.evaluate(
						() => (document.querySelector("input[name=search_query]").value = "")
					);
					await sleep(3000);

					// type song and search it
					await page.type("input[name=search_query]", track, { delay: 50 });
					await sleep(1000);
					await page.click("#search-icon-legacy");
					await page.waitForSelector("#contents");
					await sleep(3000);

					// find the menu to add song to list 
					await page.mouse.move(500, 300);
					await sleep(2000);

					await page.evaluate(() => {
						let labels = Array.from(document.querySelectorAll("#label"));
						labels[1].click();
					});

					// add song 
					await page.click(".ytp-miniplayer-expand-watch-page-button");

					await sleep(2000);
				}

				// await page.close();
				// await browser.close();

				return resolve(listTracks);

			} else {
				return reject("Ooops!! Playlist not found");
			}
		} catch (err) {
			return reject(err.message);
		}

	});
};

// function to wait in ms
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// runSpotiTube('the doors');

module.exports.runSpotiTube = runSpotiTube;
