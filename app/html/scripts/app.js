var imports = [
	"sammy",
	"jquery",
	"knockout",
	"Q",
	"viewModels/loginPageViewModel",
	"viewModels/servicesPageViewModel",

	// Place implicit references here:
	"bootstrap",
];
requirejs(imports, function(Sammy, $, ko, Q, LoginPageViewModel, ServicesPageViewModel) {

	function loadTemplates(urls) {
		var promises = urls.map(function (url) {
		    return Q($.ajax({
		        url: url,
		        dataType: 'html'
		    }).done(function (html) {
		        $('head').append(html);
		    }).fail(function (xhr) {
		    	throw new Error("Error Loading Template '" + url + "' : " + xhr.status);
		    }));
		});

		return Q.all(promises);
	}

	var app = Sammy(function() {
		var self = this;
		
		self.view = ko.observable();
		self.viewModel = ko.observable();
		self.viewTemplate = ko.computed(function () {
			var viewModel = self.viewModel();
			if (viewModel) {
				return {
					name: viewModel.viewName,
					data: viewModel,
				};
			} else {
				return {
					name: 'emptyPageTemplate',
					data: null,
				};
			}
		});

		self.buildAuthorizationHeader = function (credentials) {
			var credentialsJson = localStorage.getItem('credentials');
			if (credentialsJson) {
				var credentials = JSON.parse(credentialsJson);
				return 'Basic ' + btoa(credentials.username + ':' + credentials.password);
			}

			return null;
		};

		self.buildApiClient = function () {
			return function(req) {
				var url = "api/" + req.url;
				var headers = $.extend({}, req.headers);
				var authorization = self.buildAuthorizationHeader();
				if (authorization) {
					headers['Authorization'] = authorization;
				}

				var deferred = Q.defer();
				return Q($.ajax({
					url: url,
					dataType: 'json',
					method: req.method || 'GET',
					body: req.body,
					headers: headers,
				}).done(function (data, status, xhr) {
					deferred.resolve({
						status: xhr.status,
						body: data,
					});
				}).fail(function (xhr) {
					deferred.resolve({
						status: xhr.status,
						body: xhr.responseText,
					});
				}));

				return deferred.promise;
			}
		}

		self.clearCredentials = function() {
			localStorage.removeItem('credentials');
			self.loggedIn(false);
		};

		self.hasCredentials = function () {
			return !!localStorage.getItem('credentials');
		};

		self.initializeBindings = function($element) {
			ko.applyBindings(self, $element);
		};

		self.setCredentials = function (credentials) {
			localStorage.setItem('credentials', JSON.stringify(credentials));
			self.loggedIn(true);
		};

		self.setViewModel = function(viewModel) {
			self.viewModel(viewModel);
		};
		
		//
		// View Models / State
		// 
		self.loggedIn = ko.observable(self.hasCredentials());

		self.servicesPageViewModel = new ServicesPageViewModel(self, self.buildApiClient());
		self.loginPageViewModel = new LoginPageViewModel(self);

		//
		// Routes
		//
		self.get("/", function (context) {
			context.redirect("#/services");
		});

		self.get("#/", function (context) {
			context.redirect("#/services");
		});

		self.get("#/login", function (context) {
			self.setViewModel(self.loginPageViewModel);
		});

		self.get("#/logout", function (context) {
			self.clearCredentials();
			context.redirect("#/login");
		});

		self.get("#/services", function (context) {
			if (!self.loggedIn()) {
				context.redirect("#/login");
				return
			}

			self.setViewModel(self.servicesPageViewModel);

			self.servicesPageViewModel.listServices();
		});

		self.get("#/services/:name", function (context) {
			if (!self.loggedIn()) {
				context.redirect("#/login");
				return
			}

			self.setViewModel(self.servicesPageViewModel);

			self.servicesPageViewModel.showService(context.params['name']);			
		});
	})

    loadTemplates([
    	'templates/shared.html',
    	'templates/loginPage.html',
    	'templates/servicesPage.html'
	]).then(function () {
		app.initializeBindings();
		app.run();
	}).fail(function (err) {
		console.log(err);
	});
});