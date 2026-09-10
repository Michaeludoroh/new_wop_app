import 'dart:io';

import 'package:path_provider/path_provider.dart';

class EbookDownloadStore {
  const EbookDownloadStore();

  Future<File> fileFor(String ebookId) async {
    final directory = await getApplicationDocumentsDirectory();
    final folder = Directory('${directory.path}/ebooks');
    if (!folder.existsSync()) {
      await folder.create(recursive: true);
    }
    return File('${folder.path}/$ebookId.pdf');
  }

  Future<bool> isDownloaded(String ebookId) async {
    final file = await fileFor(ebookId);
    return file.existsSync() && file.lengthSync() > 0;
  }

  Future<File> save(String ebookId, List<int> bytes) async {
    final file = await fileFor(ebookId);
    return file.writeAsBytes(bytes, flush: true);
  }

  /// Removes locally downloaded eBooks for the current device user.
  Future<void> clearAll() async {
    final directory = await getApplicationDocumentsDirectory();
    final folder = Directory('${directory.path}/ebooks');
    if (folder.existsSync()) {
      await folder.delete(recursive: true);
    }
  }
}
