// For any third party dependencies, like jQuery, place them in the lib folder.

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'lib',
    paths: {
        app: '../app/js',
		jquery: "./jquery.min",
        bootstrap: "./lib/bootstrap/js/bootstrap.min",
        underscore: "./underscore-min",
        alertify: "./alertify/alertify.min"    
    },
	shim : {
        bootstrap: { "deps" :['jquery'] }
    }

});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['app/RecepcionYFoliado']);
//requirejs(['app/Expedientes']);
