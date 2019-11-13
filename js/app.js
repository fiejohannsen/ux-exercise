"use strict";

// ========== GLOBAL VARIABLES ========== //
const _movieRef = _db.collection("movies");
const _userRef = _db.collection("users")
let _currentUser;

// ========== FIREBASE AUTH ========== //
// Listen on authentication state change
firebase.auth().onAuthStateChanged(function(user) {
  if (user) { // if user exists and is authenticated
    userAuthenticated(user);
  } else { // if user is not logged in
    userNotAuthenticated();
  }
});

function userAuthenticated(user) {
  _currentUser = user;
  setDefaultPage();
  hideTabbar(false);
  appendUserData();
  initMovieRef();
  showLoader(false);
}

function userNotAuthenticated() {
  _currentUser = null; // reset _currentUser
  hideTabbar(true);
  showPage("login");

  // Firebase UI configuration
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    signInSuccessUrl: '#home'
  };
  // Init Firebase UI Authentication
  const ui = new firebaseui.auth.AuthUI(firebase.auth());
  ui.start('#firebaseui-auth-container', uiConfig);
  showLoader(false);
}

// show and hide tabbar
function hideTabbar(hide) {
  let tabbar = document.querySelector('#tabbar');
  if (hide) {
    tabbar.classList.add("hide");
  } else {
    tabbar.classList.remove("hide");
  }
}


// sign out user
function logout() {
  firebase.auth().signOut();
  // reset input fields
  document.querySelector('#name').value = "";
  document.querySelector('#mail').value = "";
  document.querySelector('#birthdate').value = "";
  document.querySelector('#hairColor').value = "";
  document.querySelector('#imagePreview').src = "";
}

// ========== PROFILE PAGE FUNCTIONALITY ========== //
// append user data to profile page
function appendUserData() {
  // auth user
  document.querySelector('#name').value = _currentUser.displayName;
  document.querySelector('#mail').value = _currentUser.email;

  // database user
  _userRef.doc(_currentUser.uid).get().then(function(doc) {
    let userData = doc.data();
    console.log(userData);
    if (userData) {
      document.querySelector('#birthdate').value = userData.birthdate;
      document.querySelector('#hairColor').value = userData.hairColor;
      document.querySelector('#imagePreview').src = userData.img;
    }
  });
}

// update user data - auth user and database object
function updateUser() {
  let user = firebase.auth()._currentUser;

  // update auth user
  user.updateProfile({
    displayName: document.querySelector('#name').value
  });

  // update database user
  _userRef.doc(_currentUser.uid).set({
    img: document.querySelector('#imagePreview').src,
    birthdate: document.querySelector('#birthdate').value,
    hairColor: document.querySelector('#hairColor').value
  }, {
    merge: true
  });
}

// ========== Prieview image function ========== //
function previewImage(file, previewId) {
  if (file) {
    let reader = new FileReader();
    reader.onload = function(event) {
      document.querySelector('#' + previewId).setAttribute('src', event.target.result);
    };
    reader.readAsDataURL(file);
  }
}

// ========== MOVIE FUNCTIONALITY ========== //

// initialize movie references - all movies and user's favourite movies
function initMovieRef() {
  // all movies
  _movieRef.onSnapshot(function(snapshotData) {
    let movies = snapshotData.docs;
    appendMovies(movies);
  });

  // user's favourite movies
  _userRef.doc(_currentUser.uid).onSnapshot({
    includeMetadataChanges: true
  }, function(doc) {
    if (!doc.metadata.hasPendingWrites && doc.data()) {
      appendFavMovies(doc.data().favMovies);
    }
  });
}

// append movies to the DOM
function appendMovies(movies) {
  let htmlTemplate = "";

  for (let movie of movies) {
    htmlTemplate += `
      <article>
        <h2>${movie.data().title} (${movie.data().year})</h2>
        <img src="${movie.data().img}">
        <p>${movie.data().description}</p>
        <button onclick="addToFavourites('${movie.id}')">Add to favourites</button>
      </article>
    `;
  }

  document.querySelector('#movie-container').innerHTML = htmlTemplate;
}

// append favourite movies to the DOM
function appendFavMovies(favMovieIds) {
  document.querySelector('#fav-movie-container').innerHTML = "";
  for (let movieId of favMovieIds) {
    _movieRef.doc(movieId).get().then(function(movie) {
      document.querySelector('#fav-movie-container').innerHTML += `
        <article>
          <h2>${movie.data().title} (${movie.data().year})</h2>
          <img src="${movie.data().img}">
          <p>${movie.data().description}</p>
          <button onclick="removeFromFavourites('${movie.id}')">Remove from favourites</button
        </article>
      `;
    });

  }
}

// adds a given movieId to the favMovies array inside _currentUser
function addToFavourites(movieId) {
  _userRef.doc(_currentUser.uid).set({
    favMovies: firebase.firestore.FieldValue.arrayUnion(movieId)
  }, {
    merge: true
  });
}

// removes a given movieId to the favMovies array inside _currentUser
function removeFromFavourites(movieId) {
  _userRef.doc(_currentUser.uid).update({
    favMovies: firebase.firestore.FieldValue.arrayRemove(movieId)
  });
}