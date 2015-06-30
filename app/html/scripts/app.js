requirejs(["jquery", "knockout", "Q", "bootstrap"], function($, ko, Q) {

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

	ServiceViewModel.prototype.actionsAfterRenderHandler = function (elements) {
		// var $elements = $(elements);
		// var $firstTabElement = $elements.first('.nav.nav-tabs li');
		// if ($firstTabElement) {
		// 	$firstTabElement.tab('show');
		// }
	};

	var ServiceListViewModel = function () {
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

		services.forEach(function (item, index) {
			item.selected(index === serviceIndex);
		});
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

	var RootPageViewModel = function () {
		this.serviceListViewModel = new ServiceListViewModel();

		this.serviceContainerViewModel = new ServiceContainerViewModel(
			this.serviceListViewModel.services,
			this.serviceListViewModel.selectedService);
	};

	function loadTemplates(url) {
		var deferred = Q.defer();

	    $.ajax({
	        url: url,
	        dataType: 'html'
	    }).done(function (html) {
	        $('head').append(html);
	        deferred.resolve();
	    }).fail(function (xhr) {
	    	var err = new Error("Error Loading Template '" + url + "' : " + xhr.status);
	        deferred.reject(err);
	    });

	    return deferred.promise;
	}

    loadTemplates('templates/templates.html')
    	.then(function () {
			var rootPageViewModel = new RootPageViewModel();
			ko.applyBindings(rootPageViewModel);

			$.ajax({
				url: '/api/services',
				dataType: 'json'
			}).done(function (data) {
				var serviceViewModels = data.map(function (item) {
					return new ServiceViewModel(item);
				});
				rootPageViewModel.serviceListViewModel.services(serviceViewModels);
			}).fail(function (xhr) {
				console.log("Error loading services: " + xhr.status);
				rootPageViewModel.serviceListViewModel.services([]);
			});
    	})
    	.fail(function (err) {
    		console.log(err);
    	});
});