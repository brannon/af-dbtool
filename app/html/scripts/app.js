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

		self.buildAuthorizationHeader = function () {
			var credentials = self.getCredentials();
			if (credentials) {
				return 'Basic ' + btoa(credentials.username + ':' + credentials.password);
			}

			return null;
		};

		self.buildApiClient = function () {
			function buildSuccessResponse(data, xhr) {
				var response = {
					status: xhr.status,
					body: data,			
				};

				if (xhr.status === 201) {
					response.location = xhr.getResponseHeader('Location');
				}

				return response;
			}

			function buildErrorResponse(xhr) {
				var response = {
					status: xhr.status,
					body: xhr.responseText,
				};

				return response;
			}

			var client = function(req) {
				var url = req.url;
				var headers = $.extend({}, req.headers);
				var authorization = self.buildAuthorizationHeader();
				if (authorization) {
					headers['Authorization'] = authorization;
				}

				var deferred = Q.defer();

				$.ajax({
					url: url,
					dataType: 'json',
					method: req.method || 'GET',
					body: req.body,
					headers: headers,
				}).done(function (data, _, xhr) {
					deferred.resolve(buildSuccessResponse(data, xhr));
				}).fail(function (xhr) {
					if (xhr.status >= 200 && xhr.status < 300) {
						deferred.resolve(buildSuccessResponse({}, xhr));
					} else {
						deferred.reject(buildErrorResponse(xhr));
					}
				});

				return deferred.promise;
			};

			client.startWebSocket = function (url, openCallback, dataCallback, doneCallback) {
				var wsUrl = window.location.origin; // HACK: global
				var wsUrl = wsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
				wsUrl += url;

				var ws = new WebSocket(wsUrl);
				ws.onopen = function (e) {
					openCallback(ws);
				};

				ws.onmessage = function (e) {
					dataCallback(e.data, ws);
				};

				ws.onclose = function (e) {
					doneCallback(null, ws);
				};

				ws.onerror = function (err) {
					doneCallback(err, ws);
				};
			};

			return client;
		}

		self.clearCredentials = function() {
			localStorage.removeItem('credentials');
			self.loggedIn(false);
		};

		self.getCredentials = function () {
			var credentialsJson = localStorage.getItem('credentials');
			if (credentialsJson) {
				return JSON.parse(credentialsJson);
			}

			return null;
		}

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

		self.get("#/services/:name/actions/:action_name", function (context) {
			if (!self.loggedIn()) {
				context.redirect("#/login");
				return
			}

			self.setViewModel(self.servicesPageViewModel);

			self.servicesPageViewModel.executeServiceAction(context.params['name'], context.params['action_name']);
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