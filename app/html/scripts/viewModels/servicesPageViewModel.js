var imports = [
	"knockout",
	"Q",
];
define(imports, function (ko, Q) {

	var ServiceActionViewModel = function (apiClient, actionData) {
		this.apiClient = apiClient;
		this.rel = actionData.rel;
		this.href = actionData.href;

		this.actionOutput = ko.observableArray([]);

		this.tabControlId = this.rel + 'Tab';
		this.tabPaneControlId = this.rel + 'TabPane';

		switch (this.rel) {
			case 'export':
				this.title = 'Export';
				this.description = 'Export all the things';
				break;

			case 'import':
				this.title = 'Import';
				this.description = 'Import stuff...';
				break;

			default:
				this.title = '';
				this.description = '';
		}
	}

	ServiceActionViewModel.prototype.execute = function () {
		var deferred = Q.defer(),
			self = this;

		self.actionOutput([]);
		
		self.apiClient({
			url: self.href,
			method: 'POST',
		}).then(function (response) {
			console.log('Started action');
			self.apiClient.startWebSocket(response.location, function (ws) {
				console.log('WebSocket connected: ' + response.location);
				ws.send(JSON.stringify({ messageType: 'ping' }));
			}, function (data, ws) {
				console.log('WebSocket received message: ' + data);
				var message = JSON.parse(data);
				switch (message.messageType) {
					case 'output':
						self.actionOutput.push(message.text);
						break;

					case 'exit':
						if (message.code !== 0) {
							deferred.reject(new Error('Action failed with exit code ' + message.code));
						} else {
							deferred.resolve();
						}
						break;
				}
			}, function (err, ws) {
				if (err) {
					console.log('WebSocket error: ' + err);
					deferred.reject(err);
				} else {
					console.log('WebSocket done');
					deferred.resolve();
				}
			});
		}).fail(function (response) {
			console.log(response);
			deferred.reject(new Error(response.body || 'Error executing action'));
		});

		return deferred.promise;
	};

	ServiceActionViewModel.prototype.tabClass = function(tabIndex) {
		tabIndex = ko.unwrap(tabIndex);
		return tabIndex === 0 ? 'active' : '';
	}

	function buildServiceActionViewModels(apiClient, actionsData) {
		return (actionsData || []).map(function (actionData) {
			return new ServiceActionViewModel(apiClient, actionData);
		});
	}

	var ServiceViewModel = function (apiClient, data) {
		this.iconClass = ko.observable('glyphicon glyphicon-cloud');
		this.selected = ko.observable(false);
		this.name = ko.observable(data.name || "");
		this.label = ko.observable(data.label || "");
		this.plan = ko.observable(data.plan || "");
		this.actions = ko.observableArray(buildServiceActionViewModels(apiClient, data.actions));

		var self = this;
		this.itemClass = ko.computed(function () {
			var result = 'list-group-item';
			if (self.selected()) {
				result += ' active';
			}
			return result;
		});
	};

	ServiceViewModel.prototype.executeAction = function(actionName) {
		var action = this.actions().filter(function (item) {
			return item.rel === actionName;
		})[0];

		if (!action) {
			throw new Error('Action not found.');
		}

		return action.execute();
	};

	var ServicesPageViewModel = function (app, apiClient) {
		var self = this;
		self.app = app;
		self.apiClient = apiClient;
		self.viewName = 'servicesPageTemplate';

		self.loadServicesPromise = null;
		self.services = ko.observableArray([]);
		self.selectedService = ko.observable(null);

		self.containerTemplateName = ko.computed(function () {
			var services = self.services();
			if (!services || services.length === 0) {
				return 'noServicesAvailableTemplate';
			}

			var selectedService = self.selectedService();
			return selectedService ? 'serviceDetailsTemplate' : 'noServiceSelectedTemplate';			
		});
	};

	ServicesPageViewModel.prototype.executeServiceAction = function(name, actionName) {
		var self = this;

		self.getService(name)
			.then(function (service) {
				return service.executeAction(actionName)
					.fail(function (err) {
						// TODO: Show an error page
						console.log(err);
					})
			});
	};

	ServicesPageViewModel.prototype.getService = function (name) {
		var self = this;
		return self.loadServices()
			.then(function (services) {
				var service = services.filter(function (item) {
					return item.name() === name;
				})[0];

				if (!service) {
					throw new Error('Service not found');
				}

				return service;
			});
	};

	ServicesPageViewModel.prototype.loadServices = function () {
		var self = this;

		if (self.loadServicesPromise) {
			return self.loadServicesPromise;
		}

		self.loadServicesPromise = self.apiClient({
			url: '/api/services'
		}).then(function (response) {
			var serviceViewModels = response.body.map(function (item) {
				return new ServiceViewModel(self.apiClient, item);
			});
			self.services(serviceViewModels);
			return self.services();
		}).fail(function (response) {
			console.log(response);
			self.services([]);
			return self.services();
		});

		return self.loadServicesPromise;
	};

	ServicesPageViewModel.prototype.listServices = function () {
		var self = this;

		self.loadServices()
			.then(function () {
				self.selectedService(null);
			});
	};

	ServicesPageViewModel.prototype.showService = function (name) {
		var self = this;

		self.getService(name)
			.then(function (service) {
				self.selectedService(service);
			})
			.fail(function (err) {
				// TODO: Show an error page
				console.log(err);
			});
	};

	return ServicesPageViewModel;	
});