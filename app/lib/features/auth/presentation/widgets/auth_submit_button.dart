import 'package:flutter/material.dart';

/// Botón principal de un formulario de autenticación. Se deshabilita y
/// muestra una rueda de carga mientras `isLoading` es verdadero, para que
/// el usuario nunca pueda enviar el formulario dos veces por accidente.
class AuthSubmitButton extends StatelessWidget {
  const AuthSubmitButton({
    super.key,
    required this.label,
    required this.isLoading,
    required this.onPressed,
  });

  final String label;
  final bool isLoading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : Text(label),
      ),
    );
  }
}
