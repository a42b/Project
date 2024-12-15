'use strict';

const REDIRECT_URI = 'http://127.0.0.1:5500/index.html';

const CLIENT_ID = '';
const CLIENT_SECRET = '';
let access_token = '';
let refresh_token = '';

const tracksIDs = [];
let splitInput = [];
const playlist = [];

let input;
let userId = null;
let playlistID;

const AUTHORIZE = 'https://accounts.spotify.com/authorize';

function onPageLoad() {
  if (window.location.search.length > 0) {
    handleRedirect();
  } else {
    access_token = localStorage.getItem('access_token');
  }
}

function handleRedirect() {
  const code = getCode();
  getAccessToken(code);
  window.history.pushState('', '', REDIRECT_URI);
}

function getCode() {
  let code = null;
  const queryString = window.location.search;
  if (queryString.length > 0) {
    const urlParams = new URLSearchParams(queryString);
    code = urlParams.get('code');
  }
  return code;
}

function requestAuthorization() {
  let url = AUTHORIZE;
  url += '?client_id=' + CLIENT_ID;
  url += '&response_type=code';
  url += '&redirect_uri=' + encodeURI(REDIRECT_URI);
  url += '&show_dialog=true';
  url +=
    '&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private user-top-read playlist-modify-private';
  window.location.href = url;
}

function getAccessToken(code) {
  let body = 'grant_type=authorization_code';
  body += '&code=' + code;
  body += '&redirect_uri=' + encodeURI(REDIRECT_URI);
  body += '&client_id=' + CLIENT_ID;
  body += '&client_secret=' + CLIENT_SECRET;
  callAuthorizationApi(body);
}

function callAuthorizationApi(body) {
  const req = new XMLHttpRequest();
  req.open('POST', 'https://accounts.spotify.com/api/token', true);
  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  req.setRequestHeader(
    'Authorization',
    'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
  );
  req.send(body);
  req.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse() {
  if (this.status === 200) {
    const data = JSON.parse(this.responseText);
    console.log(data);
    if (data.access_token !== undefined) {
      access_token = data.access_token;
      localStorage.setItem('access_token', access_token);
      console.log('Token: ' + access_token);
    }
    if (data.refresh_token !== undefined) {
      localStorage.setItem('refresh_token', refresh_token);
    }
    onPageLoad();
    getUserId();
  } else {
    alert(this.responseText);
  }
}

function callAPI(method, url, callback, body = null) {
  const req = new XMLHttpRequest();
  req.open(method, url, true);
  req.setRequestHeader('Authorization', 'Bearer ' + access_token);
  req.send(body);
  req.onload = callback;
}

function handleTopArtists() {
  if (this.status === 200) {
    const data = JSON.parse(this.responseText);
    console.log('Top artists: ' + data);
  } else {
    alert(this.responseText);
  }
}

async function getSearch(str) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${str}&type=track&limit=10`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + access_token,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const track = findMostSimilarTrack(str, data.tracks.items);
      if (track) {
        const trackID = track.id;
        console.log('Search track id = ' + trackID);
        tracksIDs.push(trackID);
        console.log('Track IDs: ' + tracksIDs.join(', '));
      } else {
        console.log('No similar tracks found for ' + str);
      }
    } else {
      throw new Error('Failed to fetch search data');
    }
  } catch (error) {
    console.error(error);
    alert(error);
  }
}

function getUserId() {
  callAPI('GET', 'https://api.spotify.com/v1/me', handleUserId);
}

function handleUserId() {
  if (this.status === 200) {
    const data = JSON.parse(this.responseText);
    userId = data.id;
    console.log('User ID: ' + userId);
  } else {
    alert(this.responseText);
  }
}

async function getPlaylist() {
  tracksIDs.length = 0;
  splitInput.length = 0;
  input = document.getElementById('input').value;
  console.log('Input: ' + input);
  splitInput = input.split(' ');

  try {
    const searchPromises = splitInput.map((word) => getSearch(word));
    await Promise.all(searchPromises);
    console.log('All search requests completed');
    console.log('Track IDs:', tracksIDs);

    createPlaylist();
  } catch (error) {
    console.error(error);
    alert(error);
  }
}

function createPlaylist(
  playlistName = 'Generated playlist',
  playlistDescription = 'This playlist was generated using Spotify Web API'
) {
  const body = JSON.stringify({
    name: playlistName,
    description: playlistDescription,
    public: false,
  });

  callAPI(
    'POST',
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    handleCreatePlaylist,
    body
  );
}

function handleCreatePlaylist() {
  if (this.status === 200 || this.status === 201) {
    const data = JSON.parse(this.responseText);
    console.log('Playlist was created. Check it out!');
    playlistID = data.id;
    console.log('Playlist ID: ' + playlistID);
    addTracks();
  } else {
    alert(this.responseText);
  }
}

function addTracks() {
  const trackURIs = tracksIDs.map((trackID) => `spotify:track:${trackID}`);
  const body = JSON.stringify({
    uris: trackURIs,
    position: 0,
  });
  callAPI(
    'POST',
    `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
    handleTrackAdd,
    body
  );
}

function handleTrackAdd() {
  if (this.status === 200) {
    const data = JSON.parse(this.responseText);
    console.log('Tracks added to the playlist successfully!');
  } else {
    alert(this.responseText);
  }
}

function findMostSimilarTrack(searchInput, tracks) {
  let mostSimilarTrack = null;
  let smallestLengthDifference = Infinity;

  for (const track of tracks) {
    const similarity = calculateSimilarity(searchInput, track.name);
    const lengthDifference = Math.abs(searchInput.length - track.name.length);

    const regex = new RegExp(`\\b${searchInput}\\b`, 'gi');
    const wordMatch = track.name.match(regex);

    if (
      wordMatch !== null &&
      (lengthDifference < smallestLengthDifference ||
        (lengthDifference === smallestLengthDifference &&
          similarity < calculateSimilarity(searchInput, mostSimilarTrack.name)))
    ) {
      mostSimilarTrack = track;
      smallestLengthDifference = lengthDifference;
    }
  }

  return mostSimilarTrack;
}

function calculateSimilarity(searchInput, trackName) {
  const trackNameLowerCase = trackName.toLowerCase();
  const searchInputLowerCase = searchInput.toLowerCase();

  const trackLength = trackNameLowerCase.length;
  const searchLength = searchInputLowerCase.length;

  if (trackLength === 0) return searchLength;
  if (searchLength === 0) return trackLength;

  const matrix = new Array(trackLength + 1);
  for (let i = 0; i <= trackLength; i++) {
    matrix[i] = new Array(searchLength + 1);
    matrix[i][0] = i;
  }
  for (let j = 0; j <= searchLength; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= trackLength; i++) {
    for (let j = 1; j <= searchLength; j++) {
      const cost =
        trackNameLowerCase[i - 1] === searchInputLowerCase[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[trackLength][searchLength];
}
