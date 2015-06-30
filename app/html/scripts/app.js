requirejs(["jquery", "knockout", "Q"], function($, ko, Q) {

	var ServiceViewModel = function (name) {
		this.iconClass = ko.observable('glyphicon glyphicon-cloud');
		this.selected = ko.observable(false);
		this.name = ko.observable(name);

		var self = this;
		this.itemClass = ko.computed(function () {
			var result = 'list-group-item';
			if (self.selected()) {
				result += ' active';
			}
			return result;
		});
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

	var ServiceContainerViewModel = function (selectedServiceObservable) {
		this.selectedService = selectedServiceObservable;

		var self = this;
		this.templateName = ko.computed(function () {
			var selectedService = self.selectedService();
			return selectedService ? 'serviceDetailsTemplate' : 'noServiceSelectedTemplate';
		});
	};

	var RootPageViewModel = function () {
		this.serviceListViewModel = new ServiceListViewModel();

		this.serviceContainerViewModel = new ServiceContainerViewModel(this.serviceListViewModel.selectedService);
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
					return new ServiceViewModel(item.name);
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