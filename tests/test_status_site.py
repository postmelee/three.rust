import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import status_site


class StatusSiteTests(unittest.TestCase):
    def test_daily_history_uses_committed_values_and_omits_missing_days(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args, date=None):
                env = dict(os.environ)
                if date:
                    env.update(GIT_AUTHOR_DATE=date, GIT_COMMITTER_DATE=date)
                return subprocess.check_output(['git', *args], cwd=root, env=env, stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-b', 'main')
            git('config', 'user.name', 'Site test')
            git('config', 'user.email', 'test@example.invalid')
            (root / 'docs/assets').mkdir(parents=True)
            (root / 'docs/progress-history.json').write_text('{"schemaVersion":1,"observations":[]}')
            git('add', '.'); git('commit', '-m', 'No inventory yet', date='2026-10-20T12:00:00Z')
            inventory = json.loads((ROOT / 'docs/progress.json').read_text())
            for name in ['progress.html', 'assets/progress.svg']:
                (root / 'docs' / name).write_text('committed artifact')
            for date in ['2026-10-21T10:00:00Z', '2026-10-21T20:00:00Z', '2026-10-23T12:00:00Z']:
                inventory['inventoryHash'] = date
                (root / 'docs/progress.json').write_text(json.dumps(inventory))
                git('add', '.'); git('commit', '-m', date, date=date)
            head = git('rev-parse', 'HEAD')
            # A dirty worktree must never change the published snapshot.
            (root / 'docs/progress.json').write_text('{}')
            (root / 'docs/progress.html').write_text('uncommitted artifact')
            with patch.object(status_site.progress, 'ROOT', root):
                history = status_site.committed_history('HEAD')
                points = status_site.progress.daily_history(history)
                self.assertEqual([p['day'] for p in points], ['2026-10-21', '2026-10-23'])
                self.assertEqual(points[0]['inventoryHash'], '2026-10-21T20:00:00Z')
                self.assertEqual(points[-1]['implementationCommit'], head)
                git('update-ref', 'refs/remotes/origin/main', 'HEAD~1')
                with self.assertRaises(ValueError):
                    status_site.committed_history('HEAD', main=True)
                git('update-ref', 'refs/remotes/origin/main', head)
                out = root / 'site'
                status_site.build(out, main=True)
                self.assertEqual((out / 'progress.html').read_text(), 'committed artifact\n')
                self.assertEqual(json.loads((out / 'site-build.json').read_text())['source'], 'main-commits')
                with self.assertRaises(ValueError):
                    status_site.build(out)


if __name__ == '__main__':
    unittest.main()
