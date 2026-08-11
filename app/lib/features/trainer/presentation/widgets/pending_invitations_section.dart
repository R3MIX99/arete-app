import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/clients_providers.dart';
import '../../domain/client_invitation.dart';
import 'invitation_link.dart';

/// Invitaciones que el entrenador ya envió y que nadie ha aceptado
/// todavía. Se muestran arriba del listado para que no se olviden: sin
/// esto, un cliente invitado que nunca abrió el enlace queda invisible.
class PendingInvitationsSection extends ConsumerWidget {
  const PendingInvitationsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invitations = ref.watch(pendingInvitationsProvider);
    final theme = Theme.of(context);

    return invitations.maybeWhen(
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Invitaciones pendientes',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            for (final invitation in list) ...[
              _PendingInvitationTile(invitation: invitation),
              const SizedBox(height: AppSpacing.sm),
            ],
            const SizedBox(height: AppSpacing.sm),
            Text('Clientes', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
          ],
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _PendingInvitationTile extends ConsumerStatefulWidget {
  const _PendingInvitationTile({required this.invitation});

  final ClientInvitation invitation;

  @override
  ConsumerState<_PendingInvitationTile> createState() =>
      _PendingInvitationTileState();
}

class _PendingInvitationTileState
    extends ConsumerState<_PendingInvitationTile> {
  bool _isCancelling = false;

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Cancelar la invitación?'),
        content: Text(
          'El enlace que le enviaste a ${widget.invitation.displayName} '
          'dejará de funcionar. Puedes volver a invitarlo cuando quieras.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Conservar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancelar invitación'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isCancelling = true);
    try {
      await ref
          .read(clientsRepositoryProvider)
          .cancelInvitation(widget.invitation.id);
      ref.invalidate(pendingInvitationsProvider);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text((error as dynamic).message as String)),
      );
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final invitation = widget.invitation;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(
                AppIconPaths.mail,
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invitation.displayName,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Aún no acepta la invitación',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: _isCancelling ? null : _cancel,
                child: _isCancelling
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Cancelar'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _CopyLinkButton(token: invitation.token),
        ],
      ),
    );
  }
}

class _CopyLinkButton extends StatelessWidget {
  const _CopyLinkButton({required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        await Clipboard.setData(
          ClipboardData(text: buildInvitationLink(token)),
        );
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enlace copiado.')),
        );
      },
      icon: const AppIcon(AppIconPaths.contentCopy, size: 16),
      label: const Text('Copiar enlace'),
    );
  }
}
