var LOCAL_STORAGE_KEY = 'API_KEYS:' + window.location.pathname;
var DEFAULT_KEYS = {
  'api.gettyimages.com': ['Api-Key'],
  'api.datumbox.com': ['api_key'],
  'netlicensing.labs64.com': [{username: 'demo', password: 'demo'}]
}
App.controller('Keys', function($scope) {
  var keys = localStorage.getItem(LOCAL_STORAGE_KEY) || '{}';
  $scope.keys = JSON.parse(keys) || {};
  $scope.checks = {
    saveKeys: true
  }
  $scope.changedKeys = Object.keys($scope.keys).length > 0;
  $scope.keyChanged = function() {
    $scope.changedKeys = true;
    $('#Console').scope().onAnswerChanged();
    if ($scope.checks.saveKeys) {
      var keys = JSON.stringify($scope.keys);
      localStorage.setItem(LOCAL_STORAGE_KEY, keys);
    }
  }
  $scope.$watch('keys', $scope.keyChanged, true)
  $scope.saveChanged = function() {
    if (!$scope.checks.saveKeys) {
      localStorage.setItem(LOCAL_STORAGE_KEY, '{}');
    }
  }
  $scope.keyInputs = [];
  if ($scope.spec.securityDefinitions) {
    var addedOauth = false;
    for (var label in $scope.spec.securityDefinitions) {
      def = $scope.spec.securityDefinitions[label];
      if (def.type === 'apiKey') {
        $scope.keyInputs.push({
          name: def.name,
          label: label,
        });
      } else if (def.type === 'oauth2' && !addedOauth) {
        addedOauth = true;
        $scope.keyInputs.push({
          name: 'oauth2',
          label: 'OAuth2 Token',
        });
      } else if (def.type === 'basic') {
        $scope.keyInputs.push({
          name: 'username',
          label: 'Username',
        });
        $scope.keyInputs.push({
          name: 'password',
          label: 'Password',
        });
      }
    }
  }
  var defaultKeys = DEFAULT_KEYS[$scope.spec.host];
  (defaultKeys || []).forEach(function(def) {
    if (typeof def === 'string') {
      $scope.keys[def] = $scope.keys[def] || 'lucybot-key';
    } else {
      for (keyName in def) {
        $scope.keys[keyName] = $scope.keys[keyName] || def[keyName];
      }
    }
  })
});

App.controller('Parameter', function($scope) {
  if ($scope.keys && $scope.parameter.name in $scope.keys) {
    $scope.model = $scope.keys;
  } else {
    $scope.model = $scope.answers;
  }
  $scope.inputType = 'text';
  var type = $scope.parameter.type;
  if ($scope.parameter.in === 'body') {
    $scope.inputType = 'body';
  } else if (type === 'array') {
    if ($scope.parameter.enum) {
      $scope.inputType = 'checkboxes';
    } else {
      $scope.inputType = 'dynamicArray';
    }
  } else if ($scope.parameter.enum) {
    $scope.inputType = 'radio';
  } else if (type === 'number' || type === 'integer') {
    $scope.inputType = 'number';
  }
});

App.controller('Checkboxes', function($scope) {
  $scope.chosen = {};
  var defaults = $scope.model[$scope.parameter.name];
  if (defaults) {
    defaults.forEach(function(d) {
      $scope.chosen[d] = true;
    })
  }
  var outerChanged = $scope.onAnswerChanged;
  $scope.onAnswerChanged = function() {
    var values = Object.keys($scope.chosen).filter(
      function(k) {return $scope.chosen[k]}
    );
    $scope.model[$scope.parameter.name] = values;
    outerChanged();
  }
})

App.controller('DynamicArray', function($scope) {
  $scope.items = [];
  $scope.addItem = function() {
    $scope.items.push({});
  };
  $scope.removeItem = function(index) {
    $scope.items = $scope.items.filter(function(item, i) { return i !== index })
    $scope.onAnswerChanged();
  }

  var outerChanged = $scope.onAnswerChanged;
  $scope.onAnswerChanged = function() {
    $scope.model[$scope.parameter.name] = $scope.items.map(function(item) {return item.value});
    outerChanged();
  }
});

App.controller('BodyInput', function($scope) {
  $scope.body = {};
  var outerChanged = $scope.onAnswerChanged;
  var errTimeout = null;
  $scope.onAnswerChanged = function() {
    $scope.bodyParseError = '';
    if (errTimeout) {
      clearTimeout(errTimeout);
      errTimeout = null;
    }
    var bodyObj = JSON.parse(JSON.stringify($scope.body));
    for (key in $scope.parameter.schema.properties) {
      var schema = $scope.parameter.schema.properties[key];
      if (schema.type !== 'string' && bodyObj[key]) {
        try {
          bodyObj[key] = JSON.parse(bodyObj[key]);
        } catch (e) {
          if (errTimeout) clearTimeout(errTimeout);
          var msg = 'Error parsing JSON field ' + key;
          errTimeout = setTimeout(function() {
            $scope.bodyParseError = msg;
          }, 1000);
        }
      }
    }
    $scope.model[$scope.parameter.name] = JSON.stringify(bodyObj);
    outerChanged();
  }
})
