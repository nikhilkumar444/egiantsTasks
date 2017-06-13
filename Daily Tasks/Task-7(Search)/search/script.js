// Define a new module for our app
var app = angular.module("instantSearch", []);

// Create the instant search filter

app.filter('searchFor', function(){

	// All filters must return a function. The first parameter
	// is the data that is to be filtered, and the second is an
	// argument that may be passed with a colon (searchFor:searchString)

	return function(arr, searchString){

		if(!searchString){
			return arr;
		}

		var result = [];

		searchString = searchString.toLowerCase();

		// Using the forEach helper method to loop through the array
		angular.forEach(arr, function(item){

			if(item.title.toLowerCase().indexOf(searchString) !== -1){
				result.push(item);
			}

		});

		return result;
	};

});

// The controller

function InstantSearchController($scope){


	$scope.items = [
		{
			url: 'http://www.theegiants.com/',
			title: 'Egiants Home',
		},
		{
			url: 'http://www.theegiants.com/about-us.html',
			title: 'About Us',
		},
		{
			url: 'http://www.theegiants.com/services.html',
			title: 'Services by Egiants',
		},
		{
			url: 'http://www.theegiants.com/clients.html',
			title: 'clients',
		},
		{
			url: 'http://www.theegiants.com/careers.html',
			title: 'careers',
		},
		{
			url: 'http://www.theegiants.com/contact-us.html',
			title: 'Contact-us',
		}
	];


}
