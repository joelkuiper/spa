define(['react', 'jsx!components/sidebar'], function(React, SideBar) {
    var Viewer = React.createClass({
        render: function() {
            return (
                <div>
                    <SideBar />
                </div>
            );
        }
    });

    return Viewer;
});
