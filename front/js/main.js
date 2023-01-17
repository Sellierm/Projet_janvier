let button = document.getElementById('myBtn');
if (button) {
    button.addEventListener('click', function () {
        console.log('test');
        $.ajax({
            type: "POST",
            url: "/test/",
            data: {
                data: 'test'
            },
            success: () => {
                window.location.href = "/";
            },
        });
    }, false);
}