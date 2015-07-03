var imports = [
	"knockout",
]
define(imports, function(ko) {
	var LoginPageViewModel = function (app) {
		this.app = app;
		this.viewName = "loginPageTemplate";

		this.username = ko.observable("admin")
		this.password = ko.observable("")
	};

	LoginPageViewModel.prototype.login = function () {
		this.app.setCredentials({
			username: this.username(),
			password: this.password(),
		});
		this.app.setLocation("#/");
	};

	return LoginPageViewModel;
});
