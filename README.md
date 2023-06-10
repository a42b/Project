# Spotify Playlist Generator

This project is a Spotify playlist generator created for learning purposes. The main functionality is creating a spotify playlist based on the input of the user. It was made to explore and practice different ways of making HTTP requests and interacting with the Spotify Web API. Used async and sync functions to practive different approaches.

XMLHttpRequest is employed for making XML HTTP requests to the Spotify API, enabling user authorization and accessing user information.

Fetch is used for performing track searches and adding tracks to the created playlist. 

To find the best matching track to a name playlist generator uses an algorithm inspired by the Levenshtein algorithm to calculate the similarity between the search input and track names. It takes into account factors such as length difference, word match, and Levenshtein distance. In some cases it's not always finding the track with the exact same name so far.
