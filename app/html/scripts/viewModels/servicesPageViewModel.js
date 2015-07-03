var imports = [
	"knockout",
];
define(imports, function (ko) {

	var ServiceActionViewModel = function (serviceViewModel, actionData) {
		this.rel = actionData.rel;
		this.href = actionData.href;

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

	ServiceActionViewModel.prototype.tabClass = function(tabIndex) {
		tabIndex = ko.unwrap(tabIndex);
		return tabIndex === 0 ? 'active' : '';
	}

	function buildServiceActionViewModels(serviceViewModel, actionsData) {
		return (actionsData || []).map(function (actionData) {
			return new ServiceActionViewModel(serviceViewModel, actionData);
		});
	}

	var ServiceViewModel = function (data) {
		this.iconClass = ko.observable('glyphicon glyphicon-cloud');
		this.selected = ko.observable(false);
		this.name = ko.observable(data.name || "");
		this.label = ko.observable(data.label || "");
		this.plan = ko.observable(data.plan || "");
		this.actions = ko.observableArray(buildServiceActionViewModels(this, data.actions));

		var self = this;
		this.itemClass = ko.computed(function () {
			var result = 'list-group-item';
			if (self.selected()) {
				result += ' active';
			}
			return result;
		});
	};

	var ServiceListViewModel = function (app) {
		this.app = app;
		this.services = ko.observableArray([]);
		this.selectedServiceIndex = ko.observable(null);
		
		var self = this;
		this.selectedService = ko.computed(function () {
			var services = self.services();
			var selectedServiceIndex = self.selectedServiceIndex();
			if (selectedServiceIndex !== null && services.length > 0) {
				return services[selectedServiceIndex] || null;
			} else {
				return null;
			}
		});
	};

	ServiceListViewModel.prototype.selectService = function (serviceIndex) {
		serviceIndex = ko.unwrap(serviceIndex);

		this.selectedServiceIndex(serviceIndex);

		var services = this.services();
		var selectedService;
		services.forEach(function (item, index) {
			if (index === serviceIndex) {
				selectedService = item;
				item.selected(true);
			} else {
				item.selected(false);
			}
		});

		if (selectedService) {
			this.app.setLocation("#/services/" + selectedService.name())
		}
	};

	var ServiceContainerViewModel = function (servicesObservable, selectedServiceObservable) {
		this.services = servicesObservable;
		this.selectedService = selectedServiceObservable;

		var self = this;
		this.templateName = ko.computed(function () {
			var services = self.services();
			if (!services || services.length === 0) {
				return 'noServicesAvailableTemplate';
			}

			var selectedService = self.selectedService();
			return selectedService ? 'serviceDetailsTemplate' : 'noServiceSelectedTemplate';
		});
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

	ServicesPageViewModel.prototype.loadServices = function () {
		var self = this;

		if (self.loadServicesPromise) {
			return self.loadServicesPromise;
		}

		self.loadServicesPromise = this.apiClient({
			url: 'services'
		}).then(function (data) {
			var serviceViewModels = data.map(function (item) {
				return new ServiceViewModel(item);
			});
			self.services(serviceViewModels);
			return self.services();
		}).fail(function (err) {
			console.log(err);
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

		self.loadServices()
			.then(function (services) {
				var selectedService = services.filter(function (item) {
					return item.name() === name;
				})[0];

				self.selectedService(selectedService);
			});
	};

	return ServicesPageViewModel;	
});