/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    //const port = 8000; // Change this to your server port
    const port = 1337; // Change this to your server port
    //return `http://localhost:${port}/data/restaurants.json`;
    return `http://localhost:${port}`;
  }

  static fetchRestaurantsFromCache() {
    if (_db) {
      var restaurantsStore = _db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      return restaurantsStore.getAll();
    }
    return new Promise(function(resolve, reject) {});
  }

  static fetchRestaurantsFromServer() {
    return fetch(`${DBHelper.DATABASE_URL}/restaurants`).then(function(response) {        
      return response.json().then(function(restaurantsFromServer) {

        //Cache the results
        if (_db) {
          var restaurantsStore = _db.transaction('restaurants', 'readwrite').objectStore('restaurants');        
          restaurantsFromServer.forEach(function (restaurant) {
            restaurantsStore.put(restaurant);
          });
        }
        return restaurantsFromServer;
      })
    }).catch(function(errorResponse){
      const error = (`Request failed. Returned status of ${errorResponse}`);
      callback(error, null);
    });    
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    //First try to retrieve from the server
    DBHelper.fetchRestaurantsFromServer().then(function(restaurantsFromServer){
      callback(null, restaurantsFromServer);
    }).catch(function(response){
        //If the server was not reachable, check the cache
        DBHelper.fetchRestaurantsFromCache().then(function(restaurantesFromCache){
          callback(null, restaurantesFromCache);
        }
      )}
    );
  }      

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }
  
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Fetch a review by its Restaurant ID.
   */
  static fetchReviewsByRestaurantId(restaurantId, callback) {

    //First fetch from server
    return fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${restaurantId}`).then(function(response) {        
      return response.json().then(function(reviewsFromServer) {

        //Cache the results
        if (_db) {
          let reviewsStore = _db.transaction('reviews', 'readwrite').objectStore('reviews');   
          let reviewIndex = reviewsStore.index('serverId');    
          reviewsFromServer.forEach(function (review) {

            //check if the review is already in cache. If it is, update it. If not, add it
            reviewIndex.get(IDBKeyRange.only(review.id)).then(function(reviewFromCache) {

              if(reviewFromCache) {
                review.idbInternalKey = reviewFromCache.idbInternalKey;
              }
              reviewsStore.put(review);
            })
          });
        }
        //callback(null, reviewsFromServer);
        //return reviewsFromServer;
      })
    //if server is offline, fetch from cache
    }).finally(function(response){
      let reviewsIndex = _db.transaction('reviews', 'readwrite').objectStore('reviews').index('restaurantId');
      reviewsIndex.getAll(parseInt(restaurantId)).then(function(reviewsFromCache) {
        callback(null, reviewsFromCache);
        return reviewsFromCache;
      })
    });    
  }  

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/dist/img/photos/${restaurant.photograph}.jpg`);
  }

    /**
   * Restaurant thumbnail image URL.
   */
  static thumbnailImageUrlForRestaurant(restaurant) {
    return (`/dist/img/photos/thumbnails/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static setFavorite(restaurantId, isFavorite) {

    //First update cache
    var store = _db.transaction('restaurants', 'readwrite').objectStore('restaurants');

    return store.get(restaurantId).then(function(restaurantFromCache) {

      restaurantFromCache.is_favorite = isFavorite;

      return store.put(restaurantFromCache).then(function() {

        //try to update the server
        return fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurantId}/?is_favorite=${isFavorite}`, { method: "PUT" })
        .then(function(response) {
          console.log('server updated');
          return;
        })
        //if it fails, store the request to be tried later
        .catch(function(response){
          console.log('database offline, adding \'update favorite\' request to queue', response);
          if (_db) {
            var store = _db.transaction('favoriteRequestQueue', 'readwrite').objectStore('favoriteRequestQueue');        
            store.put({timestamp: Date.now(), restaurantId: restaurantId, isFavorite: isFavorite});
          }
        });          
      });
    });        
  }

  static addReview(review) {

    //set creation time
    review.createdAt = new Date();

    //First update cache
    let store = _db.transaction('reviews', 'readwrite').objectStore('reviews');
    return store.put(review).then(function(idbInternalKey) {

      //try to update the server
      return fetch(`${DBHelper.DATABASE_URL}/reviews`, { method: "POST", body: JSON.stringify(review) })
      .then(function(reviewFromServer) {
        //If success, update cache with object generated from the server
        return reviewFromServer.json().then(function(reviewFromServer) {
          reviewFromServer.idbInternalKey = idbInternalKey;
          let store = _db.transaction('reviews', 'readwrite').objectStore('reviews');
          return store.put(reviewFromServer);
        })
      })
      //if it fails, store the request to be retried later
      .catch(function(response){
        console.log('database offline, adding \'add review\' request to queue', response);
        if (_db) {
          let store = _db.transaction('reviewRequestQueue', 'readwrite').objectStore('reviewRequestQueue');  
          review.idbInternalKey = idbInternalKey;      
          store.put({timestamp: Date.now(), review});
        }
      });          
    });
  }
}

