/* global django */
(function ($) {
  "use strict";

  function helpHtml(theme) {
    if (!theme || theme === "single") {
      return (
        "<p><strong>Single</strong>: one variant row; <em>Attribute values</em> are optional.</p>"
      );
    }
    if (theme === "custom") {
      return (
        "<p><strong>Custom</strong>: pick any attribute values per variant (search in each row).</p>"
      );
    }
    var parts = theme.split("-").map(function (p) {
      return p.trim();
    }).filter(Boolean);
    var dims = parts.join(", ");
    return (
      "<p>For this theme, each variant row should include one <em>Attribute value</em> per dimension, " +
      "whose <strong>Attribute name</strong> matches (case-insensitive): <strong>" +
      dims +
      "</strong>.</p>" +
      "<p>Example for <code>size-color</code>: pick one Size value and one Color value per variant.</p>"
    );
  }

  function refreshHint() {
    var $field = $("#id_variation_theme");
    if (!$field.length) {
      return;
    }
    var theme = $field.val();
    $("#variation-theme-dynamic-hint").html(helpHtml(theme));
  }

  $(function () {
    $(document).on("change", "#id_variation_theme", refreshHint);
    refreshHint();
  });
})(django.jQuery);
