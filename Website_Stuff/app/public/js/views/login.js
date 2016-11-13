
$(document).ready(function(){

	var lv = new LoginValidator();

// main login form //

	// grab userId from URL hash
	var userId = document.location.hash.replace("#", "");

	$('#login').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			
			var userIdObject = {
				name: 'userId',
				required: true,
				type: 'userId',
				value: userId
			};

			formData.push(userIdObject);

			if (lv.validateForm() == false){
				return false;
			} 	else{
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			if (status == 'success') window.location.href = '/complete';
		},
		error : function(e){
			lv.showLoginError('Login Failure', 'Oops, it seems we have encountered a problem. Please try again!');
		}
	}); 
	$('#user-tf').focus();
	
});
